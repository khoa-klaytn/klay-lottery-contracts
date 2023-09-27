// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {VRFConsumerBase} from "@bisonai/orakl-contracts/src/v0.1/VRFConsumerBase.sol";
import {IVRFCoordinator} from "@bisonai/orakl-contracts/src/v0.1/interfaces/IVRFCoordinator.sol";
import {IPrepayment} from "@bisonai/orakl-contracts/src/v0.1/interfaces/IPrepayment.sol";
import {IRandomNumberGenerator} from "./interfaces/IRandomNumberGenerator.sol";
import {IKlayLottery} from "./interfaces/IKlayLottery.sol";
import {OnlyLotteryable} from "./OnlyLotteryable.sol";

contract RandomNumberGenerator is VRFConsumerBase, IRandomNumberGenerator, OnlyLotteryable {
    IVRFCoordinator COORDINATOR;
    bytes32 private keyHash;
    uint32 public callbackGasLimit;
    uint256 private latestLotteryId;
    uint256 private latestRequestId;
    uint32 private randomResult;

    constructor(address coordinator, bytes32 _keyHash, uint32 _callbackGasLimit) VRFConsumerBase(coordinator) {
        COORDINATOR = IVRFCoordinator(coordinator);
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
        randomResult = uint32(1000000 + (randomWords[0] % 1000000));
        latestLotteryId = IKlayLottery(klayLottery).viewCurrentLotteryId();
    }

    // ------------------------- //
    // onlyKlayLottery functions //
    // ------------------------- //

    /**
     * @notice Request random number using Permanent Account
     * @param accId: Permanent Account ID
     */
    function requestRandomNumber(uint64 accId) external override onlyKlayLottery {
        latestRequestId = COORDINATOR.requestRandomWords(keyHash, accId, callbackGasLimit, 1);
    }

    /**
     * @notice Request random number using Temporary Account
     */
    function requestRandomNumberDirect() external payable override onlyKlayLottery {
        latestRequestId = COORDINATOR.requestRandomWords{value: msg.value}(
            keyHash,
            callbackGasLimit,
            1,
            payable(address(this))
        );
    }

    /**
     * @notice View latestLotteryId
     */
    function viewLatestLotteryId() external view override onlyKlayLottery returns (uint256) {
        return latestLotteryId;
    }

    /**
     * @notice View random result
     */
    function viewRandomResult() external view override onlyKlayLottery returns (uint32) {
        return randomResult;
    }

    // -------------------- //
    // onlyOwner functions //
    // -------------------- //

    function cancelRequest(uint256 requestId) external onlyOwner {
        COORDINATOR.cancelRequest(requestId);
    }

    function withdrawTemporary(uint64 accId) external onlyOwner {
        address prepaymentAddress = COORDINATOR.getPrepaymentAddress();
        IPrepayment(prepaymentAddress).withdrawTemporary(accId, payable(msg.sender));
    }

    /**
     * @notice Change the keyHash
     * @param _keyHash: new keyHash
     */
    function setKeyHash(bytes32 _keyHash) external onlyOwner {
        keyHash = _keyHash;
    }

    /**
     * @notice Set the callback gas limit
     * @param _callbackGasLimit: new callback gas limit
     */
    function setCallbackGasLimit(uint32 _callbackGasLimit) external onlyOwner {
        callbackGasLimit = _callbackGasLimit;
    }
}
