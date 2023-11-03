// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {IAggregator} from "@bisonai/orakl-contracts/src/v0.1/interfaces/IAggregator.sol";
import {OnlyRoles} from "./OnlyRoles.sol";
import {IDataFeedConsumer} from "./interfaces/IDataFeedConsumer.sol";

error AnswerNonPositive();

contract DataFeedConsumer is IDataFeedConsumer, OnlyRoles {
    IAggregator internal dataFeed;
    uint8 internal constant DECIMALS_CRYPTO = 18;
    uint8 internal immutable DECIMALS_USD;
    uint256 internal immutable BASE_CRYPTO = 10 ** DECIMALS_CRYPTO;
    uint256 internal immutable BASE_USD;

    constructor(address _aggregatorProxyAddress) {
        dataFeed = IAggregator(_aggregatorProxyAddress);
        uint8 decimals_usd = dataFeed.decimals();
        DECIMALS_USD = decimals_usd;
        uint256 base_usd = 10 ** DECIMALS_USD;
        BASE_USD = base_usd;
    }

    // ------------------------- //
    // onlySSLottery functions //
    // ------------------------- //

    function convertCryptoUsd(uint256 crypto) external view override onlySSLottery returns (uint256 usd) {
        return _convertCryptoUsd(crypto);
    }

    function convertUsdCrypto(uint256 usd) external view override onlySSLottery returns (uint256 crypto) {
        return _convertUsdCrypto(usd);
    }

    // --------------------- //
    // onlyQuerier functions //
    // --------------------- //

    function queryDecimalsCrypto() external view onlyQuerier returns (uint8) {
        return DECIMALS_CRYPTO;
    }

    function queryDecimalsUsd() external view onlyQuerier returns (uint8) {
        return DECIMALS_USD;
    }

    function queryBaseCrypto() external view onlyQuerier returns (uint256) {
        return BASE_CRYPTO;
    }

    function queryBaseUsd() external view onlyQuerier returns (uint256) {
        return BASE_USD;
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
        usd = (crypto * _getLatestData()) / BASE_CRYPTO;
    }

    function _convertUsdCrypto(uint256 usd) internal view returns (uint256 crypto) {
        crypto = (usd * BASE_CRYPTO) / _getLatestData();
    }

    function requirePositive(int256 answer) internal pure {
        if (answer <= 0) {
            revert AnswerNonPositive();
        }
    }
}
