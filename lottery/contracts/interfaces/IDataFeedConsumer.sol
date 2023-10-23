// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {IAggregator} from "@bisonai/orakl-contracts/src/v0.1/interfaces/IAggregator.sol";

interface IDataFeedConsumer {
    function getLatestData() external view returns (int256, uint8);
}
