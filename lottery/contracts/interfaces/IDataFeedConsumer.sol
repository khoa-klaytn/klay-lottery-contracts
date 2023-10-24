// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {IAggregator} from "@bisonai/orakl-contracts/src/v0.1/interfaces/IAggregator.sol";

interface IDataFeedConsumer {
    function convertCryptoUsd(uint256 crypto) external view returns (uint256 usd);

    function convertUsdCrypto(uint256 usd) external view returns (uint256 crypto);
}
