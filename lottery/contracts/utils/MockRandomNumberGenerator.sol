//SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {OnlyLotteryable} from "../OnlyLotteryable.sol";
import "../interfaces/IRandomNumberGenerator.sol";
import "../interfaces/IKlayLottery.sol";

contract MockRandomNumberGenerator is IRandomNumberGenerator, OnlyLotteryable {
    uint32 public randomResult;
    uint256 public nextRandomResult;
    uint256 public latestLotteryId;

    /**
     * @notice Constructor
     * @dev MockRandomNumberGenerator must be deployed before the lottery.
     */
    constructor() {}

    /**
     * @notice Set the address for the KlayLottery
     * @param _nextRandomResult: next random result
     */
    function setNextRandomResult(uint256 _nextRandomResult) external onlyOwner {
        nextRandomResult = _nextRandomResult;
    }

    /**
     * @notice Request random number using Permanent Account
     * @param accId: Permanent Account ID
     */
    function requestRandomNumber(uint64 accId) external override onlyKlayLottery {
        fulfillRandomness(0, nextRandomResult);
    }

    /**
     * @notice Request random number using Temporary Account
     */
    function requestRandomNumberDirect() external payable override onlyKlayLottery {
        fulfillRandomness(0, nextRandomResult);
    }

    /**
     * @notice Change latest lotteryId to currentLotteryId
     */
    function changeLatestLotteryId() external {
        latestLotteryId = IKlayLottery(klayLottery).viewCurrentLotteryId();
    }

    /**
     * @notice View latestLotteryId
     */
    function viewLatestLotteryId() external view override returns (uint256) {
        return latestLotteryId;
    }

    /**
     * @notice View random result
     */
    function viewRandomResult() external view override returns (uint32) {
        return randomResult;
    }

    /**
     * @notice Callback function used by ChainLink's VRF Coordinator
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal {
        randomResult = uint32(1000000 + (randomness % 1000000));
    }
}
