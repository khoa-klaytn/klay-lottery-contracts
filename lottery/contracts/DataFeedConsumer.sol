// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {IAggregator} from "@bisonai/orakl-contracts/src/v0.1/interfaces/IAggregator.sol";
import {OnlyRoles} from "./OnlyRoles.sol";
import {IDataFeedConsumer} from "./interfaces/IDataFeedConsumer.sol";

error AnswerNonPositive();

contract DataFeedConsumer is IDataFeedConsumer, OnlyRoles {
    IAggregator internal dataFeed;
    uint8 internal immutable DECIMALS;

    constructor(address aggregatorProxy) {
        dataFeed = IAggregator(aggregatorProxy);
        DECIMALS = dataFeed.decimals();
    }

    // ------------------------- //
    // onlyKlayLottery functions //
    // ------------------------- //

    function convertCryptoUsd(uint256 crypto) external view override onlyKlayLottery returns (uint256 usd) {
        return _convertCryptoUsd(crypto);
    }

    function convertUsdCrypto(uint256 usd) external view override onlyKlayLottery returns (uint256 crypto) {
        return _convertUsdCrypto(usd);
    }

    // --------------------- //
    // onlyQuerier functions //
    // --------------------- //

    function queryDecimals() external view onlyQuerier returns (uint8) {
        return DECIMALS;
    }

    function queryLatestData() external view onlyQuerier returns (uint256) {
        return _getLatestData();
    }

    // ------------------ //
    // internal functions //
    // ------------------ //

    function _getLatestData() internal view returns (uint256) {
        (, int256 answer_, , , ) = dataFeed.latestRoundData();
        requirePositive(answer_);
        return uint256(answer_);
    }

    function _convertCryptoUsd(uint256 crypto) internal view returns (uint256 usd) {
        usd = (crypto * _getLatestData()) / (10 ** DECIMALS);
    }

    function _convertUsdCrypto(uint256 usd) internal view returns (uint256 crypto) {
        crypto = (usd * (10 ** DECIMALS)) / _getLatestData();
    }

    function requirePositive(int256 answer) internal pure {
        if (answer <= 0) {
            revert AnswerNonPositive();
        }
    }
}
