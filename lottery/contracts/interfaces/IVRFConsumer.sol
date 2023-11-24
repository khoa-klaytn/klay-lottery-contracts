// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

interface IVRFConsumer {
    function estimateFee() external view returns (uint256);

    function requestRandomNumber() external;

    /**
     * View latest lotteryId numbers
     */
    function latestLotteryId() external view returns (uint256);

    /**
     * Views random result
     */
    function randomResult() external view returns (uint32);
}
