// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {IAggregator} from "@bisonai/orakl-contracts/src/v0.1/interfaces/IAggregator.sol";
import {OnlyLotteryable} from "./OnlyLotteryable.sol";

contract DataFeedConsumer is OnlyLotteryable {
    IAggregator internal dataFeed;
    int256 public answer;
    uint8 public decimals;

    constructor(address aggregatorProxy) {
        dataFeed = IAggregator(aggregatorProxy);
    }

    function getLatestData() public onlyKlayLottery returns (int256, uint8) {
        (, int256 answer_, , , ) = dataFeed.latestRoundData();
        uint8 decimals_ = dataFeed.decimals();

        answer = answer_;
        decimals = decimals_;

        return (answer_, decimals_);
    }
}
