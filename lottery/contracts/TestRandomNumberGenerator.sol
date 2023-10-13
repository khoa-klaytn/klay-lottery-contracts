// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "./RandomNumberGenerator.sol";

contract TestRandomNumberGenerator is RandomNumberGenerator {
    constructor(
        address coordinator,
        bytes32 _keyHash,
        uint32 _callbackGasLimit
    ) RandomNumberGenerator(coordinator, _keyHash, _callbackGasLimit) {}

    /**
     * @notice Request random number using Temporary Account
     */
    function requestRandomNumberDirectTest() external payable {
        latestRequestId = COORDINATOR.requestRandomWords{value: msg.value}(keyHash, callbackGasLimit, 1, klayLottery);
    }

    function viewKeyHash() external view returns (bytes32) {
        return keyHash;
    }

    function viewLatestRequestId() external view returns (uint256) {
        return latestRequestId;
    }
}
