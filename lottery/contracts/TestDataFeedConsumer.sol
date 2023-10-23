// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "./DataFeedConsumer.sol";

contract TestDataFeedConsumer is DataFeedConsumer {
    constructor(address aggregatorProxy) DataFeedConsumer(aggregatorProxy) {}

    function getLatestDataTest() external view returns (int256, uint8) {
        (, int256 answer_, , , ) = dataFeed.latestRoundData();
        uint8 decimals_ = dataFeed.decimals();
        return (answer_, decimals_);
    }
}
