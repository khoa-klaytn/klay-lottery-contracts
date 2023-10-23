// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IKlayLottery.sol";
import "./interfaces/IRandomNumberGenerator.sol";

error LotteryNotClaimable();
error EndTimePast();
error TicketPriceLow(uint256 min);
error DiscountDivisorLow(uint256 min);
error PortionsInvalidLen();
error PortionDescending(uint8 i);
error PortionsExceedMax(string name);

error LotteryNotOpen();

error LotteryOver();
error TicketNumberInvalid(uint32 number);
error InsufficientFunds(uint256 sending, uint256 demanding);

error LotteryNotOver();

error LotteryNotClose();
error FinalNumberNotDrawn();

error TicketIdInvalid();
error TicketNotYours();
error SendFailed();

/**
 * @notice Subset of KlayLottery holding graph-indexed properties
 */
contract IndexedKlayLottery is IKlayLottery, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    address internal constant ZERO_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    address payable public operatorAddress;

    uint256 public currentLotteryId;
    uint256 public currentTicketId;

    uint256 public maxNumberTicketsPerBuyOrClaim = 100;
    uint256 public minPriceTicket = 1 ether;

    uint256 public pendingInjectionNextLottery;

    uint16 public constant MAX_PORTION = 10000;
    uint256 public constant MIN_DISCOUNT_DIVISOR = 300;

    IRandomNumberGenerator public randomGenerator;

    enum Status {
        Pending,
        Open,
        Close,
        Claimable
    }

    struct Lottery {
        Status status;
        uint256 startTime;
        uint256 endTime;
        uint256 priceTicket;
        uint256 discountDivisor;
        uint8 numBrackets;
        uint16[] rewardPortions; // index: no. of matching numbers; e.g. 0: no matching numbers
        uint16 winnersPortion; // 500: 5% // 200: 2% // 50: 0.5%
        uint16 burnPortion; // 500: 5% // 200: 2% // 50: 0.5%
        uint256[] rewardPerUserPerBracket;
        uint256[] countWinnersPerBracket;
        uint256 firstTicketId;
        uint256 firstTicketIdNextLottery;
        uint256 amountCollected;
        uint32 finalNumber;
    }

    struct Ticket {
        uint32 number;
        address owner;
    }

    // Mapping are cheaper than arrays
    mapping(uint256 => Lottery) internal _lotteries;
    mapping(uint256 => Ticket) internal _tickets;

    // Keeps track of number of ticket per unique combination for each lotteryId
    mapping(uint256 => mapping(uint32 => uint256)) internal _numberTicketsPerLotteryId;

    // Keep track of user ticket ids for a given lotteryId
    mapping(address => mapping(uint256 => uint256[])) internal _userTicketIdsPerLotteryId;

    /**
     * @notice Check if an address is a contract
     */
    function _isContract(address _addr) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(_addr)
        }
        return size > 0;
    }

    modifier notContract() {
        require(!_isContract(msg.sender), "Contract not allowed");
        require(msg.sender == tx.origin, "Proxy contract not allowed");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operatorAddress, "Not operator");
        _;
    }

    event LotteryOpen(
        uint256 indexed lotteryId,
        uint256 startTime,
        uint256 endTime,
        uint256 priceTicket,
        uint256 firstTicketId,
        uint256 injectedAmount
    );
    event TicketsPurchase(address indexed buyer, uint256 indexed lotteryId, uint256 numberTickets);
    event LotteryClose(uint256 indexed lotteryId, uint256 firstTicketIdNextLottery);
    event LotteryNumberDrawn(uint256 indexed lotteryId, uint32 finalNumber, uint256 countWinningTickets);
    event TicketsClaim(address indexed claimer, uint256 amount, uint256 indexed lotteryId, uint256 numberTickets);

    /**
     * @notice Constructor
     * @dev RandomNumberGenerator must be deployed prior to this contract
     * @param _randomGeneratorAddress: address of the RandomGenerator contract used to work with ChainLink VRF
     */
    constructor(address _randomGeneratorAddress) {
        randomGenerator = IRandomNumberGenerator(_randomGeneratorAddress);
    }

    function demand(uint256 sending, uint256 demanding) internal pure {
        if (sending < demanding) {
            revert InsufficientFunds(sending, demanding);
        }
    }

    function send(address recipient, uint256 amount) internal {
        demand(address(this).balance, amount);
        bool sent = payable(recipient).send(amount);
        if (!sent) {
            revert SendFailed();
        }
    }

    function burn(uint256 amount) internal {
        send(ZERO_ADDRESS, amount);
    }

    receive() external payable {}

    fallback() external payable {}

    function transformNumber(uint32 number, uint8 base) internal pure returns (uint32) {
        return number % (uint32(10) ** base);
    }

    /**
     * @notice Buy tickets for the current lottery
     * @param _lotteryId: lotteryId
     * @param _ticketNumbers: array of ticket numbers between 0 and 999,999
     * @dev Callable by users
     */
    function buyTickets(
        uint256 _lotteryId,
        uint32[] calldata _ticketNumbers
    ) external payable notContract nonReentrant {
        require(_ticketNumbers.length != 0, "No ticket specified");
        require(_ticketNumbers.length <= maxNumberTicketsPerBuyOrClaim, "Too many tickets");

        requireOpen(_lotteryId);
        if (block.timestamp >= _lotteries[_lotteryId].endTime) {
            revert LotteryOver();
        }

        // Calculate cost of tickets
        uint256 amountToTransfer = _calculateTotalPriceForBulkTickets(
            _lotteries[_lotteryId].discountDivisor,
            _lotteries[_lotteryId].priceTicket,
            _ticketNumbers.length
        );
        demand(msg.value, amountToTransfer);

        // Increment the total amount collected for the lottery round
        _lotteries[_lotteryId].amountCollected += amountToTransfer;

        for (uint256 i = 0; i < _ticketNumbers.length; i++) {
            uint32 thisTicketNumber = _ticketNumbers[i];

            requireValidTicketNumber(thisTicketNumber);

            _numberTicketsPerLotteryId[_lotteryId][thisTicketNumber]++;

            _userTicketIdsPerLotteryId[msg.sender][_lotteryId].push(currentTicketId);

            _tickets[currentTicketId] = Ticket({number: thisTicketNumber, owner: msg.sender});

            // Increase lottery ticket number
            currentTicketId++;
        }

        emit TicketsPurchase(msg.sender, _lotteryId, _ticketNumbers.length);
    }

    /**
     * @notice Claim a set of winning tickets for a lottery
     * @param _lotteryId: lottery id
     * @param _ticketIds: array of ticket ids
     * @dev Callable by users only, not contract!
     */
    function claimTickets(uint256 _lotteryId, uint256[] calldata _ticketIds) external notContract nonReentrant {
        require(_ticketIds.length != 0, "Length must be >0");
        require(_ticketIds.length <= maxNumberTicketsPerBuyOrClaim, "Too many tickets");
        requireClaimable(_lotteryId);

        // Initialize reward
        uint256 reward;

        for (uint256 i = 0; i < _ticketIds.length; i++) {
            uint256 thisTicketId = _ticketIds[i];

            requireValidTicketId(_lotteryId, thisTicketId);
            requireTicketOwner(thisTicketId);

            // Update the lottery ticket owner to 0x address
            _tickets[thisTicketId].owner = address(0);

            uint256 rewardForTicketId = _calculateRewardsForTicketId(_lotteryId, thisTicketId);

            // Increment the reward to transfer
            reward += rewardForTicketId;
        }

        // Transfer reward to msg.sender
        send(msg.sender, reward);

        emit TicketsClaim(msg.sender, reward, _lotteryId, _ticketIds.length);
    }

    function _closeLottery(uint256 _lotteryId) internal {
        _lotteries[_lotteryId].firstTicketIdNextLottery = currentTicketId;

        // Request a random number from the generator
        uint256 fee = randomGenerator.estimateFee();
        demand(address(this).balance, fee);
        randomGenerator.requestRandomNumberDirect{value: fee}();

        _lotteries[_lotteryId].amountCollected -= fee;
        _lotteries[_lotteryId].status = Status.Close;

        emit LotteryClose(_lotteryId, currentTicketId);
    }

    /**
     * @notice Close lottery
     * @param _lotteryId: lottery id
     * @dev Callable by operator
     */
    function closeLottery(uint256 _lotteryId) external onlyOperator nonReentrant {
        requireOpen(_lotteryId);
        if (block.timestamp < _lotteries[_lotteryId].endTime) {
            revert LotteryNotOver();
        }
        _closeLottery(_lotteryId);
    }

    function makeLotteryClaimable(uint256 _lotteryId, bool _autoInjection, uint32 _finalNumber) internal onlyOperator {
        uint256 numWinners;

        // Calculate the amount to share post-burn fee
        uint256 amountToShareToWinners = (_lotteries[_lotteryId].amountCollected *
            _lotteries[_lotteryId].winnersPortion) / MAX_PORTION;

        // Initializes the amount to burn
        uint256 amountToBurn;

        // Calculate prizes for each bracket by starting from the highest one
        for (uint8 i = 6; i != 0; i--) {
            uint8 bracket = i - 1;
            uint32 transformedWinningNumber = transformNumber(_finalNumber, i);
            uint256 bracketNumWinners = _numberTicketsPerLotteryId[_lotteryId][transformedWinningNumber];
            uint256 bracketReward = _lotteries[_lotteryId].rewardPortions[bracket];
            uint256 bracketAmountToShare = (amountToShareToWinners * bracketReward) / MAX_PORTION;

            _lotteries[_lotteryId].countWinnersPerBracket[bracket] = bracketNumWinners;

            // A. If number of users for this _bracket number is superior to 0
            if (bracketNumWinners != 0) {
                // B. If rewards at this bracket are > 0, calculate, else,
                // report the numberAddresses from previous bracket
                if (bracketReward != 0) {
                    _lotteries[_lotteryId].rewardPerUserPerBracket[bracket] = bracketAmountToShare / bracketNumWinners;
                }

                numWinners += bracketNumWinners;
                // A. No winners to distribute to, reward is added to the amount to burn
            } else {
                _lotteries[_lotteryId].rewardPerUserPerBracket[bracket] = 0;

                amountToBurn += bracketAmountToShare;
            }
        }

        // Update internal statuses for lottery
        _lotteries[_lotteryId].finalNumber = _finalNumber;
        _lotteries[_lotteryId].status = Status.Claimable;

        if (_autoInjection) {
            pendingInjectionNextLottery = amountToBurn;
            amountToBurn = 0;
        }

        amountToBurn += (_lotteries[_lotteryId].amountCollected * _lotteries[_lotteryId].burnPortion) / MAX_PORTION;

        // Burn
        burn(amountToBurn);

        emit LotteryNumberDrawn(currentLotteryId, _finalNumber, numWinners);
    }

    /**
     * @notice Draw the final number, calculate reward per group, and make lottery claimable
     * @param _lotteryId: lottery id
     * @param _autoInjection: reinjects funds into next lottery (vs. withdrawing all)
     * @dev Callable by operator
     */
    function drawFinalNumberAndMakeLotteryClaimable(
        uint256 _lotteryId,
        bool _autoInjection
    ) external onlyOperator nonReentrant {
        requireClose(_lotteryId);
        if (_lotteryId != randomGenerator.latestLotteryId()) {
            revert FinalNumberNotDrawn();
        }

        // Calculate the finalNumber based on the randomResult generated by ChainLink's fallback
        uint32 finalNumber = randomGenerator.randomResult();
        makeLotteryClaimable(_lotteryId, _autoInjection, finalNumber);
    }

    function initRewardPortion(
        uint16[] memory rewardPortions,
        uint256[] memory rewardPerUserPerBracket,
        uint256[] memory countWinnersPerBracket,
        uint8 i,
        uint16 portion,
        uint16 nextPortion
    ) internal pure {
        requireNonDescendingPortion(portion, nextPortion, i);
        rewardPortions[i] = portion;
        rewardPerUserPerBracket[i] = 0;
        countWinnersPerBracket[i] = 0;
    }

    function initRewardPortions(
        uint16[] calldata _rewardPortions,
        uint8 numBrackets
    ) internal pure returns (uint16[] memory, uint256[] memory, uint256[] memory) {
        uint8 rewardPortionsLen = numBrackets + 1;

        uint16[] memory rewardPortions = new uint16[](rewardPortionsLen);
        uint256[] memory rewardPerUserPerBracket = new uint256[](rewardPortionsLen);
        uint256[] memory countWinnersPerBracket = new uint256[](rewardPortionsLen);

        uint16 rewardPortionsTotal = 0;

        uint16 nextRewardPortion = MAX_PORTION;
        for (uint8 i = numBrackets; i != 0; i--) {
            uint16 rewardPortion = _rewardPortions[i - 1];
            initRewardPortion(
                rewardPortions,
                rewardPerUserPerBracket,
                countWinnersPerBracket,
                i,
                rewardPortion,
                nextRewardPortion
            );
            nextRewardPortion = rewardPortion;
            rewardPortionsTotal += rewardPortion;
        }
        requireValidPortions("rewards", rewardPortionsTotal);

        uint16 allWinnersPortion = MAX_PORTION - rewardPortionsTotal;
        initRewardPortion(
            rewardPortions,
            rewardPerUserPerBracket,
            countWinnersPerBracket,
            0,
            allWinnersPortion,
            nextRewardPortion
        );

        return (rewardPortions, rewardPerUserPerBracket, countWinnersPerBracket);
    }

    /**
     * @notice Start the lottery
     * @dev Callable by operator
     * @param _endTime: endTime of the lottery
     * @param _priceTicket: price of a ticket
     * @param _discountDivisor: the divisor to calculate the discount magnitude for bulks
     * @param _winnersPortion: winners portion (10,000 = 100%, 100 = 1%)
     * @param _burnPortion: burn portion (10,000 = 100%, 100 = 1%)
     * @param _rewardPortions: portion of rewards per bracket
     */
    function startLottery(
        uint256 _endTime,
        uint256 _priceTicket,
        uint256 _discountDivisor,
        uint16 _winnersPortion,
        uint16 _burnPortion,
        uint16[] calldata _rewardPortions
    ) external onlyOperator {
        if (currentLotteryId != 0) {
            requireClaimable(currentLotteryId);
        }

        if (_endTime < block.timestamp) {
            revert EndTimePast();
        }

        if (_priceTicket < minPriceTicket) {
            revert TicketPriceLow(minPriceTicket);
        }

        if (_discountDivisor < MIN_DISCOUNT_DIVISOR) {
            revert DiscountDivisorLow(MIN_DISCOUNT_DIVISOR);
        }

        requireValidPortions("winners & burn", _winnersPortion + _burnPortion);

        // Init Reward Portions
        uint8 numBrackets;
        {
            uint256 uncheckedNumBrackets = _rewardPortions.length;
            requireValidPortionsLen(uncheckedNumBrackets);
            numBrackets = uint8(uncheckedNumBrackets);
        }
        (
            uint16[] memory rewardPortions,
            uint256[] memory rewardPerUserPerBracket,
            uint256[] memory countWinnersPerBracket
        ) = initRewardPortions(_rewardPortions, numBrackets);

        // Commit
        currentLotteryId++;

        _lotteries[currentLotteryId] = Lottery({
            status: Status.Open,
            startTime: block.timestamp,
            endTime: _endTime,
            priceTicket: _priceTicket,
            discountDivisor: _discountDivisor,
            winnersPortion: _winnersPortion,
            burnPortion: _burnPortion,
            numBrackets: numBrackets,
            rewardPortions: rewardPortions,
            rewardPerUserPerBracket: rewardPerUserPerBracket,
            countWinnersPerBracket: countWinnersPerBracket,
            firstTicketId: currentTicketId,
            firstTicketIdNextLottery: currentTicketId,
            amountCollected: pendingInjectionNextLottery,
            finalNumber: 0
        });

        emit LotteryOpen(
            currentLotteryId,
            block.timestamp,
            _endTime,
            _priceTicket,
            currentTicketId,
            pendingInjectionNextLottery
        );

        pendingInjectionNextLottery = 0;
    }

    function isClaimable(uint256 _lotteryId) internal view returns (bool) {
        return _lotteries[_lotteryId].status == Status.Claimable;
    }

    function requireClaimable(uint256 _lotteryId) internal view {
        if (!isClaimable(_lotteryId)) {
            revert LotteryNotClaimable();
        }
    }

    function requireOpen(uint256 _lotteryId) internal view {
        if (_lotteries[_lotteryId].status != Status.Open) {
            revert LotteryNotOpen();
        }
    }

    function requireClose(uint256 _lotteryId) internal view {
        if (_lotteries[_lotteryId].status != Status.Close) {
            revert LotteryNotClose();
        }
    }

    function requireValidPortionsLen(uint256 len) internal pure {
        if ((len < 3) || (len > 6)) {
            revert PortionsInvalidLen();
        }
    }

    function requireNonDescendingPortion(uint16 portion, uint16 nextPortion, uint8 i) internal pure {
        if (nextPortion < portion) {
            revert PortionDescending(i);
        }
    }

    function requireValidPortions(string memory name, uint16 total) internal pure {
        if (total > MAX_PORTION) {
            revert PortionsExceedMax(name);
        }
    }

    function ticketNumberIsValid(uint32 ticketNumber) internal pure returns (bool) {
        return (ticketNumber >= 0) && (ticketNumber <= 999999);
    }

    function requireValidTicketNumber(uint32 ticketNumber) internal pure {
        if (!ticketNumberIsValid(ticketNumber)) {
            revert TicketNumberInvalid(ticketNumber);
        }
    }

    function ticketIdIsValid(uint256 lotteryId, uint256 ticketId) internal view returns (bool) {
        return
            (ticketId >= _lotteries[lotteryId].firstTicketId) &&
            (ticketId < _lotteries[lotteryId].firstTicketIdNextLottery);
    }

    function requireValidTicketId(uint256 lotteryId, uint256 ticketId) internal view {
        if (!ticketIdIsValid(lotteryId, ticketId)) {
            revert TicketIdInvalid();
        }
    }

    function requireTicketOwner(uint256 ticketId) internal view {
        if (msg.sender != _tickets[ticketId].owner) {
            revert TicketNotYours();
        }
    }

    /**
     * @notice Calculate rewards for a given ticket
     * @param _lotteryId: lottery id
     * @param _ticketId: ticket id
     */
    function _calculateRewardsForTicketId(uint256 _lotteryId, uint256 _ticketId) internal view returns (uint256) {
        // Retrieve the winning number combination
        uint32 winningTicketNumber = _lotteries[_lotteryId].finalNumber;

        // Retrieve the user number combination from the ticketId
        uint32 userNumber = _tickets[_ticketId].number;

        for (uint8 i = 6; i != 0; i--) {
            // Compare the two numbers combination, from the end to the beginning
            // If they are equal, return the reward for this bracket
            if (transformNumber(winningTicketNumber, i) == transformNumber(userNumber, i)) {
                return _lotteries[_lotteryId].rewardPerUserPerBracket[i - 1];
            }
        }

        // No matching numbers, return 0
        return 0;
    }

    /**
     * @notice Calculate final price for bulk of tickets
     * @param _discountDivisor: divisor for the discount (the smaller it is, the greater the discount is)
     * @param _priceTicket: price of a ticket
     * @param _numberTickets: number of tickets purchased
     */
    function _calculateTotalPriceForBulkTickets(
        uint256 _discountDivisor,
        uint256 _priceTicket,
        uint256 _numberTickets
    ) internal pure returns (uint256) {
        return (_priceTicket * _numberTickets * (_discountDivisor + 1 - _numberTickets)) / _discountDivisor;
    }
}
