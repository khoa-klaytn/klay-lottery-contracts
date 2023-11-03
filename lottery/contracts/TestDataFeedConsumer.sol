// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "./DataFeedConsumer.sol";

contract TestDataFeedConsumer is DataFeedConsumer {
    constructor(address _aggregatorProxyAddress) DataFeedConsumer(_aggregatorProxyAddress) {}

    function getLatestDataTest() external view returns (uint256) {
        return _getLatestData();
    }

    function convertCryptoUsdTest(uint256 crypto) external view returns (uint256 usd) {
        return _convertCryptoUsd(crypto);
    }

    function convertUsdCryptoTest(uint256 usd) external view returns (uint256 crypto) {
        return _convertUsdCrypto(usd);
    }
}
