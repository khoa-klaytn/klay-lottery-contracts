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

    function _getLatestData() internal view returns (uint256) {
        (, int256 answer_, , , ) = dataFeed.latestRoundData();
        requirePositive(answer_);
        return uint256(answer_);
    }

    function getLatestData() external view onlyOwner returns (uint256) {
        return _getLatestData();
    }

    function _convertCryptoUsd(uint256 crypto) internal view returns (uint256 usd) {
        usd = (crypto * _getLatestData()) / (10 ** DECIMALS);
    }

    function convertCryptoUsd(uint256 crypto) external view override onlyKlayLottery returns (uint256 usd) {
        return _convertCryptoUsd(crypto);
    }

    function _convertUsdCrypto(uint256 usd) internal view returns (uint256 crypto) {
        crypto = (usd * (10 ** DECIMALS)) / _getLatestData();
    }

    function convertUsdCrypto(uint256 usd) external view override onlyKlayLottery returns (uint256 crypto) {
        return _convertUsdCrypto(usd);
    }

    function requirePositive(int256 answer) internal pure {
        if (answer <= 0) {
            revert AnswerNonPositive();
        }
    }
}
