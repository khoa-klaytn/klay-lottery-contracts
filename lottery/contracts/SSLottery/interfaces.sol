// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

interface ISSLottery {
    /**
     * @notice View current lottery id
     */
    function currentLotteryId() external returns (uint256);
}
