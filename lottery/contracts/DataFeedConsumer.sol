// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {IAggregator} from "@bisonai/orakl-contracts/src/v0.1/interfaces/IAggregator.sol";
import {OnlyLotteryable} from "./OnlyLotteryable.sol";
import {IDataFeedConsumer} from "./interfaces/IDataFeedConsumer.sol";

error AnswerNonPositive();

contract DataFeedConsumer is IDataFeedConsumer, OnlyLotteryable {
    IAggregator internal dataFeed;

    constructor(address aggregatorProxy) {
        dataFeed = IAggregator(aggregatorProxy);
    }

    function getLatestData() external view onlyKlayLottery returns (uint256, uint8) {
        (, int256 answer_, , , ) = dataFeed.latestRoundData();
        requirePositive(answer_);
        uint8 decimals_ = dataFeed.decimals();
        return (uint256(answer_), decimals_);
    }

    function requirePositive(int256 answer) internal pure {
        if (answer <= 0) {
            revert AnswerNonPositive();
        }
    }
}
