// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {IAggregator} from "@bisonai/orakl-contracts/src/v0.1/interfaces/IAggregator.sol";
import {OnlyLotteryable} from "./OnlyLotteryable.sol";
import {IDataFeedConsumer} from "./interfaces/IDataFeedConsumer.sol";

error AnswerNonPositive();

contract DataFeedConsumer is IDataFeedConsumer, OnlyLotteryable {
    IAggregator internal dataFeed;
    uint8 public immutable DECIMALS;

    constructor(address aggregatorProxy) {
        dataFeed = IAggregator(aggregatorProxy);
        DECIMALS = dataFeed.decimals();
    }

    function getLatestData() public view returns (uint256) {
        (, int256 answer_, , , ) = dataFeed.latestRoundData();
        requirePositive(answer_);
        return uint256(answer_);
    }

    function requirePositive(int256 answer) internal pure {
        if (answer <= 0) {
            revert AnswerNonPositive();
        }
    }
}
