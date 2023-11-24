// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {VRFConsumer} from "./index.sol";

contract TestVRFConsumer is VRFConsumer {
    constructor(
        address _roleControlAddress,
        address _contractControlAddress,
        address _coordinatorAddress,
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        address _prepaymentAddress,
        uint64 _prepaymentAccId
    )
        VRFConsumer(
            _roleControlAddress,
            _contractControlAddress,
            _coordinatorAddress,
            _keyHash,
            _callbackGasLimit,
            _prepaymentAddress,
            _prepaymentAccId
        )
    {}

    function viewKeyHash() external view returns (bytes32) {
        return keyHash;
    }

    function viewLatestRequestId() external view returns (uint256) {
        return latestRequestId;
    }
}
