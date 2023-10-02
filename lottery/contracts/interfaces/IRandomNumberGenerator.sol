// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

interface IRandomNumberGenerator {
    function estimateFee() external view returns (uint256);

    function requestRandomNumber(uint64 accId) external;

    function requestRandomNumberDirect() external payable;

    /**
     * View latest lotteryId numbers
     */
    function viewLatestLotteryId() external view returns (uint256);

    /**
     * Views random result
     */
    function viewRandomResult() external view returns (uint32);
}
