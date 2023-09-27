// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "../interfaces/IPaymentToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockPaymentToken is IPaymentToken, Ownable {
    mapping(address => uint256) public balances;

    function send(address recipient, uint256 amount) external override returns (bool sent) {
        balances[address(this)] -= amount;
        balances[recipient] += amount;
        sent = true;
    }

    function demand(uint256 amount) external payable override {
        balances[address(this)] += amount;
        balances[msg.sender] -= amount;
    }

    function getBalance(address account) external view override returns (uint256) {
        return balances[account];
    }

    function mint(address recipient, uint256 amount) external onlyOwner {
        balances[recipient] += amount;
    }
}
