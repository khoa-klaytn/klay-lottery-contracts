// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {VRFConsumerBase} from "@bisonai/orakl-contracts/src/v0.1/VRFConsumerBase.sol";
import {IPrepayment} from "@bisonai/orakl-contracts/src/v0.1/interfaces/IPrepayment.sol";
import {RoleControlConsumer} from "./AccessControl/Consumer.sol";
import {RoleName} from "./AccessControl/enums.sol";
import {OnlyRoles} from "./OnlyRoles.sol";
import {IVRFConsumer} from "./interfaces/IVRFConsumer.sol";
import {ICoordinator} from "./interfaces/ICoordinator.sol";
import {ISSLottery} from "./interfaces/ISSLottery.sol";

contract VRFConsumer is VRFConsumerBase, IVRFConsumer, RoleControlConsumer, OnlyRoles {
    ICoordinator coordinator;
    uint256 public latestLotteryId;
    uint32 public randomResult;
    bytes32 internal keyHash;
    uint32 internal callbackGasLimit;
    uint256 internal latestRequestId;

    constructor(
        address _accessControlAddress,
        address _coordinatorAddress,
        bytes32 _keyHash,
        uint32 _callbackGasLimit
    ) VRFConsumerBase(_coordinatorAddress) RoleControlConsumer(_accessControlAddress) {
        coordinator = ICoordinator(_coordinatorAddress);
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;
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
        latestLotteryId = ISSLottery(ssLottery).currentLotteryId();
    }

    function estimateFee() external view returns (uint256) {
        return coordinator.estimateFee(1, 1, callbackGasLimit);
    }

    // --------------------- //
    // SSLottery functions //
    // --------------------- //

    /**
     * @notice Request random number using Permanent Account
     * @param accId: Permanent Account ID
     */
    function requestRandomNumber(uint64 accId) external override onlySSLottery {
        latestRequestId = coordinator.requestRandomWords(keyHash, accId, callbackGasLimit, 1);
    }

    /**
     * @notice Request random number using Temporary Account
     */
    function requestRandomNumberDirect() external payable override onlySSLottery {
        latestRequestId = coordinator.requestRandomWords{value: msg.value}(keyHash, callbackGasLimit, 1, ssLottery);
    }

    // ----------------- //
    // Querier functions //
    // ----------------- //

    function queryKeyHash() external view onlyRole(RoleName.Querier) returns (bytes32) {
        return keyHash;
    }

    function queryCallbackGasLimit() external view onlyRole(RoleName.Querier) returns (uint32) {
        return callbackGasLimit;
    }

    function queryLatestLotteryId() external view onlyRole(RoleName.Querier) returns (uint256) {
        return latestLotteryId;
    }

    // --------------------- //
    // OwnerMember functions //
    // --------------------- //

    function cancelRequest(uint256 requestId) external onlyOwnerMember {
        coordinator.cancelRequest(requestId);
    }

    function withdrawTemporary(uint64 accId) external onlyOwnerMember {
        address prepaymentAddress = coordinator.getPrepaymentAddress();
        IPrepayment(prepaymentAddress).withdrawTemporary(accId, payable(msg.sender));
    }

    /**
     * @notice Change the keyHash
     * @param _keyHash: new keyHash
     */
    function setKeyHash(bytes32 _keyHash) external onlyOwnerMember {
        keyHash = _keyHash;
    }

    /**
     * @notice Set the callback gas limit
     * @param _callbackGasLimit: new callback gas limit
     */
    function setCallbackGasLimit(uint32 _callbackGasLimit) external onlyOwnerMember {
        callbackGasLimit = _callbackGasLimit;
    }
}
