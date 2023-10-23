// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {IAggregator} from "@bisonai/orakl-contracts/src/v0.1/interfaces/IAggregator.sol";
import {OnlyLotteryable} from "./OnlyLotteryable.sol";
import {IDataFeedConsumer} from "./interfaces/IDataFeedConsumer.sol";

contract DataFeedConsumer is IDataFeedConsumer, OnlyLotteryable {
    IAggregator internal dataFeed;

    constructor(address aggregatorProxy) {
        dataFeed = IAggregator(aggregatorProxy);
    }

    function getLatestData() external view onlyKlayLottery returns (int256, uint8) {
        (, int256 answer_, , , ) = dataFeed.latestRoundData();
        uint8 decimals_ = dataFeed.decimals();
        return (answer_, decimals_);
    }
}
