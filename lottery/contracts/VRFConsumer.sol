// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {VRFConsumerBase} from "@bisonai/orakl-contracts/src/v0.1/VRFConsumerBase.sol";
import {IPrepayment} from "@bisonai/orakl-contracts/src/v0.1/interfaces/IPrepayment.sol";
import {ContractControlConsumer} from "./ContractControl/Consumer.sol";
import {ContractName} from "./ContractControl/enum.sol";
import {RoleControlConsumer} from "./RoleControl/Consumer.sol";
import {RoleName} from "./RoleControl/enum.sol";
import {IVRFConsumer} from "./interfaces/IVRFConsumer.sol";
import {ICoordinator} from "./interfaces/ICoordinator.sol";
import {ISSLottery} from "./SSLottery/interfaces.sol";

error WithdrawFailed();

contract VRFConsumer is VRFConsumerBase, IVRFConsumer, ContractControlConsumer, RoleControlConsumer {
    ICoordinator internal coordinator;
    IPrepayment internal prepayment;
    uint64 public prepaymentAccId;
    address internal ssLotteryAddress;
    ISSLottery internal ssLottery;

    uint256 public latestLotteryId;
    uint32 public randomResult;
    bytes32 public keyHash;
    uint32 public callbackGasLimit;
    uint256 public latestRequestId;

    constructor(
        address _roleControlAddress,
        address _contractControlAddress,
        address _coordinatorAddress,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        address _prepaymentAddress,
        uint64 _prepaymentAccId
    )
        VRFConsumerBase(_coordinatorAddress)
        ContractControlConsumer(_contractControlAddress, ContractName.VRFConsumer)
        RoleControlConsumer(_roleControlAddress)
    {
        coordinator = ICoordinator(_coordinatorAddress);
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;

        prepayment = IPrepayment(_prepaymentAddress);
        prepaymentAccId = _prepaymentAccId;
    }

    function addRoleDependencies() internal override {
        addRoleDependency(RoleName.Owner);
    }

    function addContractDependencies() internal override {
        addContractDependency(ContractName.SSLottery);
    }

    function isControlContract(ContractName contractName, address sender) internal view override returns (bool) {
        if (contractName == ContractName.SSLottery) {
            return ssLotteryAddress == sender;
        }
        return false;
    }

    function _onContractAddressChange(ContractName contractName, address contractAddress) internal override {
        if (contractName == ContractName.SSLottery && contractAddress != ssLotteryAddress) {
            ssLottery = ISSLottery(contractAddress);
            ssLotteryAddress = contractAddress;
        }
    }

    // ------------------------- //
    // VRFConsumerBase functions //
    // ------------------------- //

    // Receive remaining payment from requestRandomWordsPayment
    receive() external payable {}

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        // requestId should be checked if it matches the expected request
        require(latestRequestId == requestId, "Wrong requestId");
        // Generate random value between 1 and 50.
        randomResult = uint32(randomWords[0] % 1000000);
        latestLotteryId = ssLottery.currentLotteryId();
    }

    function estimateFee() external view returns (uint256) {
        uint64 reqCount = prepayment.getReqCount(prepaymentAccId);
        return coordinator.estimateFee(reqCount, 1, callbackGasLimit);
    }

    // --------------------- //
    // SSLottery functions //
    // --------------------- //

    /**
     * @notice Request random number using Permanent Account
     */
    function requestRandomNumber() external override onlyControlContract(ContractName.SSLottery) {
        latestRequestId = coordinator.requestRandomWords(keyHash, prepaymentAccId, callbackGasLimit, 1);
    }

    // --------------------- //
    // OwnerMember functions //
    // --------------------- //

    function setCoordinator(address _coordinatorAddress) external onlyRole(RoleName.Owner) {
        coordinator = ICoordinator(_coordinatorAddress);
    }

    function setPrepayment(address _prepaymentAddress, uint64 _prepaymentAccId) external onlyRole(RoleName.Owner) {
        prepayment = IPrepayment(_prepaymentAddress);
        prepaymentAccId = _prepaymentAccId;
    }

    function setPrepaymentAccId(uint64 _prepaymentAccId) external onlyRole(RoleName.Owner) {
        prepaymentAccId = _prepaymentAccId;
    }

    function cancelRequest(uint256 requestId) external onlyRole(RoleName.Owner) {
        coordinator.cancelRequest(requestId);
    }

    function withdraw(uint256 amount) external onlyOwner {
        prepayment.withdraw(prepaymentAccId, amount);
        bool sent = payable(msg.sender).send(amount);
        if (!sent) {
            revert WithdrawFailed();
        }
    }

    /**
     * @notice Change the keyHash
     * @param _keyHash: new keyHash
     */
    function setKeyHash(bytes32 _keyHash) external onlyRole(RoleName.Owner) {
        keyHash = _keyHash;
    }

    /**
     * @notice Set the callback gas limit
     * @param _callbackGasLimit: new callback gas limit
     */
    function setCallbackGasLimit(uint32 _callbackGasLimit) external onlyRole(RoleName.Owner) {
        callbackGasLimit = _callbackGasLimit;
    }
}
