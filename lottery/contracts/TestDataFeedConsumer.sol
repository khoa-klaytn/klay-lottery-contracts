// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "./DataFeedConsumer.sol";

contract TestDataFeedConsumer is DataFeedConsumer {
    constructor(address aggregatorProxy) DataFeedConsumer(aggregatorProxy) {}

    function getLatestDataTest() external view returns (uint256) {
        return getLatestData();
    }
}
