// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {IVRFCoordinator} from "@bisonai/orakl-contracts/src/v0.1/interfaces/IVRFCoordinator.sol";

interface ICoordinator is IVRFCoordinator {
    function estimateFee(uint64 reqCount, uint8 numSubmission, uint32 callbackGasLimit) external view returns (uint256);
}
