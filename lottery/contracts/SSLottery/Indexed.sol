// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;
pragma abicoder v2;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ContractControlConsumer} from "../ContractControl/Consumer.sol";
import {ContractName} from "../ContractControl/enum.sol";
import {RoleControlConsumer} from "../RoleControl/Consumer.sol";
import {RoleName} from "../RoleControl/enum.sol";
import {IVRFConsumer} from "../interfaces/IVRFConsumer.sol";
import {IDataFeedConsumer} from "../interfaces/IDataFeedConsumer.sol";
import {ISSLottery} from "./interfaces.sol";

error LotteryNotClaimable();
error EndTimePast();
error TicketPriceLow(uint256 min);
error DiscountDivisorLow(uint256 min);
error PortionsInvalidLen();
error PortionDescending(uint8 i);
error PortionsExceedMax(bytes32 name);

error LotteryNotOpen();

error LotteryOver();
error TicketNumberInvalid(uint32 number);
error InsufficientFunds(uint256 sending, uint256 demanding);

error LotteryNotOver();

error LotteryNotClose();
error FinalNumberNotDrawn();

error TicketIdInvalid();
error TicketNotYours(uint256 ticketId);
error SendFailed();

/**
 * @notice Subset of SSLottery holding graph-indexed properties
 */
contract IndexedSSLottery is ISSLottery, ReentrancyGuard, ContractControlConsumer, RoleControlConsumer {
    using SafeERC20 for IERC20;

    address internal constant ZERO_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    uint256 public currentLotteryId;
    uint256 public currentTicketId;

    uint256 public maxNumberTicketsPerBuyOrClaim = 100;

    uint256 public pendingInjectionNextLottery;

    uint256 public immutable MIN_TICKET_PRICE_IN_USD;
    uint16 public constant MAX_PORTION = 10000;
    uint256 public constant MIN_DISCOUNT_DIVISOR = 300;

    address internal treasuryAddress;
    address internal vrfConsumerAddress;
    IVRFConsumer internal vrfConsumer;
    address internal dataFeedAddress;
    IDataFeedConsumer internal dataFeed;

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
        uint256 ticketPrice;
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

    event LotteryOpen(
        uint256 indexed lotteryId,
        uint256 startTime,
        uint256 endTime,
        uint256 ticketPrice,
        uint256 firstTicketId,
        uint8 numBrackets,
        uint256 injectedAmount
    );
    event TicketsPurchase(address indexed buyer, uint256 indexed lotteryId, uint256 numberTickets);
    event LotteryClose(uint256 indexed lotteryId, uint256 firstTicketIdNextLottery);
    event LotteryNumberDrawn(uint256 indexed lotteryId, uint32 finalNumber, uint256 countWinningTickets);
    event TicketsClaim(address indexed claimer, uint256 amount, uint256 indexed lotteryId, uint256 numberTickets);

    constructor(
        address _roleControlAddress,
        address _contractControlAddress,
        uint256 _minTicketPriceInUsd
    )
        ContractControlConsumer(_contractControlAddress, ContractName.SSLottery)
        RoleControlConsumer(_roleControlAddress)
    {
        MIN_TICKET_PRICE_IN_USD = _minTicketPriceInUsd;
    }

    function addRoleDependencies() internal override {
        addRoleDependency(RoleName.Owner);
        addRoleDependency(RoleName.Operator);
        addRoleDependency(RoleName.Injector);
        addRoleDependency(RoleName.Querier);
    }

    function addContractDependencies() internal override {
        addContractDependency(ContractName.Treasury);
        addContractDependency(ContractName.DataFeedConsumer);
        addContractDependency(ContractName.VRFConsumer);
    }

    function _onContractAddressChange(ContractName _contractName, address contractAddress) internal override {
        if (_contractName == ContractName.Treasury && contractAddress != ZERO_ADDRESS) {
            treasuryAddress = contractAddress;
        } else if (_contractName == ContractName.VRFConsumer && contractAddress != vrfConsumerAddress) {
            vrfConsumer = IVRFConsumer(contractAddress);
            dataFeedAddress = contractAddress;
        } else if (_contractName == ContractName.DataFeedConsumer && contractAddress != dataFeedAddress) {
            dataFeed = IDataFeedConsumer(contractAddress);
            vrfConsumerAddress = contractAddress;
        }
    }

    function isControlContract(ContractName _contractName, address sender) internal view override returns (bool) {
        if (_contractName == ContractName.Treasury) {
            return sender == treasuryAddress;
        } else if (_contractName == ContractName.VRFConsumer) {
            return sender == vrfConsumerAddress;
        } else if (_contractName == ContractName.DataFeedConsumer) {
            return sender == dataFeedAddress;
        }
        return false;
    }

    function demand(uint256 sending, uint256 demanding) internal pure {
        if (sending < demanding) {
            revert InsufficientFunds(sending, demanding);
        }
    }

    function send(address recipient, uint256 amount) internal {
        demand(thisAddress.balance, amount);
        bool sent = payable(recipient).send(amount);
        if (!sent) {
            revert SendFailed();
        }
    }

    function burn(uint256 amount) internal {
        send(ZERO_ADDRESS, amount);
    }

    function treasure(uint256 amount) internal {
        send(treasuryAddress, amount);
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
            _lotteries[_lotteryId].ticketPrice,
            _ticketNumbers.length
        );
        demand(msg.value, amountToTransfer);

        for (uint256 i = 0; i < _ticketNumbers.length; i++) {
            uint32 thisTicketNumber = _ticketNumbers[i];

            requireValidTicketNumber(thisTicketNumber);

            uint32 prevTicketNumber = thisTicketNumber;
            _numberTicketsPerLotteryId[_lotteryId][thisTicketNumber]++;
            for (uint8 bracket = _lotteries[_lotteryId].numBrackets - 1; bracket != 0; bracket--) {
                uint32 transformedTicketNumber = transformNumber(thisTicketNumber, bracket);
                if (transformedTicketNumber != prevTicketNumber) {
                    _numberTicketsPerLotteryId[_lotteryId][transformedTicketNumber]++;
                    prevTicketNumber = transformedTicketNumber;
                }
            }

            _userTicketIdsPerLotteryId[msg.sender][_lotteryId].push(currentTicketId);

            _tickets[currentTicketId] = Ticket({number: thisTicketNumber, owner: msg.sender});

            // Increase lottery ticket number
            currentTicketId++;
        }

        // Increment the total amount collected for the lottery round
        _lotteries[_lotteryId].amountCollected += amountToTransfer;

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
        uint256 fee = vrfConsumer.estimateFee();
        demand(thisAddress.balance, fee);
        vrfConsumer.requestRandomNumberDirect{value: fee}(thisAddress);

        _lotteries[_lotteryId].status = Status.Close;

        emit LotteryClose(_lotteryId, currentTicketId);
    }

    /**
     * @notice Close lottery
     * @param _lotteryId: lottery id
     * @dev Callable by operator
     */
    function closeLottery(uint256 _lotteryId) external onlyRole(RoleName.Operator) nonReentrant {
        requireOpen(_lotteryId);
        if (block.timestamp < _lotteries[_lotteryId].endTime) {
            revert LotteryNotOver();
        }
        _closeLottery(_lotteryId);
    }

    /**
     * @return bracketAmountToBurn
     */
    function setBracket(
        Lottery memory lottery,
        uint256 _lotteryId,
        uint8 i,
        uint256 bracketNumWinners,
        uint256 amountToShareToWinners
    ) internal returns (uint256 bracketAmountToBurn) {
        _lotteries[_lotteryId].countWinnersPerBracket[i] = bracketNumWinners;

        uint16 rewardPortion = lottery.rewardPortions[i];
        if (rewardPortion != 0) {
            uint256 bracketAmountToShare = (amountToShareToWinners * rewardPortion) / MAX_PORTION;
            if (bracketNumWinners == 0) {
                bracketAmountToBurn = bracketAmountToShare;
            } else {
                _lotteries[_lotteryId].rewardPerUserPerBracket[i] = bracketAmountToShare / bracketNumWinners;
            }
        }
    }

    function makeLotteryClaimable(
        uint256 _lotteryId,
        bool _autoInjection,
        uint32 _finalNumber
    ) internal onlyRole(RoleName.Operator) {
        uint256 numWinners;

        Lottery memory lottery = _lotteries[_lotteryId];
        uint256 amountToBurn;
        {
            // Calculate the amount to share post-burn fee
            uint256 amountToShareToWinners = (lottery.amountCollected * lottery.winnersPortion) / MAX_PORTION;

            // Calculate prizes for each bracket by starting from the highest one
            for (uint8 i = lottery.numBrackets; i != 0; i--) {
                uint256 bracketNumWinners;
                {
                    uint32 transformedFinalNumber = transformNumber(_finalNumber, i);
                    bracketNumWinners = _numberTicketsPerLotteryId[_lotteryId][transformedFinalNumber] - numWinners;
                }
                if (bracketNumWinners != 0) {
                    numWinners += bracketNumWinners;
                }
                amountToBurn += setBracket(lottery, _lotteryId, i, bracketNumWinners, amountToShareToWinners);
            }
            {
                uint256 bracketNumWinners = lottery.firstTicketIdNextLottery - lottery.firstTicketId - numWinners;
                amountToBurn += setBracket(lottery, _lotteryId, 0, bracketNumWinners, amountToShareToWinners);
            }
        }

        // Update internal statuses for lottery
        _lotteries[_lotteryId].finalNumber = _finalNumber;
        _lotteries[_lotteryId].status = Status.Claimable;

        if (_autoInjection) {
            pendingInjectionNextLottery = amountToBurn;
            amountToBurn = 0;
        }

        // Burn
        amountToBurn += (lottery.amountCollected * lottery.burnPortion) / MAX_PORTION;
        treasure(amountToBurn);

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
    ) external onlyRole(RoleName.Operator) nonReentrant {
        requireClose(_lotteryId);
        if (_lotteryId != vrfConsumer.latestLotteryId()) {
            revert FinalNumberNotDrawn();
        }

        // Calculate the finalNumber based on the randomResult generated by ChainLink's fallback
        uint32 finalNumber = vrfConsumer.randomResult();
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
     * @param _ticketPriceInUsd: price of a ticket in USD
     * @param _discountDivisor: the divisor to calculate the discount magnitude for bulks
     * @param _winnersPortion: winners portion (10,000 = 100%, 100 = 1%)
     * @param _burnPortion: burn portion (10,000 = 100%, 100 = 1%)
     * @param _rewardPortions: portion of rewards per bracket
     */
    function startLottery(
        uint256 _endTime,
        uint256 _ticketPriceInUsd,
        uint256 _discountDivisor,
        uint16 _winnersPortion,
        uint16 _burnPortion,
        uint16[] calldata _rewardPortions
    ) external onlyRole(RoleName.Operator) {
        if (currentLotteryId != 0) {
            requireClaimable(currentLotteryId);
        }

        if (_endTime < block.timestamp) {
            revert EndTimePast();
        }

        if (_ticketPriceInUsd < MIN_TICKET_PRICE_IN_USD) {
            revert TicketPriceLow(MIN_TICKET_PRICE_IN_USD);
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

        // Convert price to crypto
        uint256 ticketPrice = dataFeed.convertUsdCrypto(_ticketPriceInUsd);
        // Commit
        currentLotteryId++;

        _lotteries[currentLotteryId] = Lottery({
            status: Status.Open,
            startTime: block.timestamp,
            endTime: _endTime,
            ticketPrice: ticketPrice,
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
            ticketPrice,
            currentTicketId,
            numBrackets,
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

    function requireValidPortions(bytes32 name, uint16 total) internal pure {
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
            revert TicketNotYours(ticketId);
        }
    }

    /**
     * @notice Calculate rewards for a given ticket
     * @param _lotteryId: lottery id
     * @param _ticketId: ticket id
     */
    function _calculateRewardsForTicketId(uint256 _lotteryId, uint256 _ticketId) internal view returns (uint256) {
        // Retrieve the winning number combination
        Lottery memory lottery = _lotteries[_lotteryId];

        // Retrieve the user number combination from the ticketId
        uint32 userNumber = _tickets[_ticketId].number;

        for (uint8 i = lottery.numBrackets; i != 0; i--) {
            // Compare the two numbers combination, from the end to the beginning
            // If they are equal, return the reward for this bracket
            if (transformNumber(lottery.finalNumber, i) == transformNumber(userNumber, i)) {
                return lottery.rewardPerUserPerBracket[i];
            }
        }

        // No matching numbers, return allWinners reward
        return lottery.rewardPerUserPerBracket[0];
    }

    /**
     * @notice Calculate final price for bulk of tickets
     * @param _discountDivisor: divisor for the discount (the smaller it is, the greater the discount is)
     * @param _ticketPrice: price of a ticket
     * @param _numberTickets: number of tickets purchased
     */
    function _calculateTotalPriceForBulkTickets(
        uint256 _discountDivisor,
        uint256 _ticketPrice,
        uint256 _numberTickets
    ) internal pure returns (uint256) {
        return (_ticketPrice * _numberTickets * (_discountDivisor + 1 - _numberTickets)) / _discountDivisor;
    }
}
