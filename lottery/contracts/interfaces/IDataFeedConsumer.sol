// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {IAggregator} from "@bisonai/orakl-contracts/src/v0.1/interfaces/IAggregator.sol";

interface IDataFeedConsumer {
    function answer() external view returns (int256);

    function decimals() external view returns (uint8);

    function getLatestData() external view returns (int256, uint8);
}
