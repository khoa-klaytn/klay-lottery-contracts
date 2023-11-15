// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

contract ThisAddress {
    address internal thisAddress;

    constructor() {
        thisAddress = address(this);
    }
}
