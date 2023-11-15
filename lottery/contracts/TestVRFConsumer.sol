// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {VRFConsumer} from "./VRFConsumer.sol";

contract TestVRFConsumer is VRFConsumer {
    constructor(
        address _roleControlAddress,
        address _contractControlAddress,
        address _coordinatorAddress,
        bytes32 _keyHash,
        uint32 _callbackGasLimit
    ) VRFConsumer(_roleControlAddress, _contractControlAddress, _coordinatorAddress, _keyHash, _callbackGasLimit) {}

    /**
     * @notice Request random number using Temporary Account
     */
    function requestRandomNumberDirectTest() external payable {
        latestRequestId = coordinator.requestRandomWords{value: msg.value}(keyHash, callbackGasLimit, 1, msg.sender);
    }

    function viewKeyHash() external view returns (bytes32) {
        return keyHash;
    }

    function viewLatestRequestId() external view returns (uint256) {
        return latestRequestId;
    }
}
