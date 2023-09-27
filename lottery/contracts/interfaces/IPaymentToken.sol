// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

interface IPaymentToken {
    function send(address recipient, uint256 amount) external returns (bool);

    function demand(uint256 amount) external payable;

    function getBalance(address account) external view returns (uint256);
}
