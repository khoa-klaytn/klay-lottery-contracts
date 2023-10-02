// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {IPaymentToken} from "./interfaces/IPaymentToken.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract PaymentToken is IPaymentToken {
    function send(address recipient, uint256 amount) external override returns (bool sent) {
        sent = payable(recipient).send(amount);
    }

    function demand(uint256 amount) external payable override {
        require(msg.value >= amount, string.concat(Strings.toString(msg.value), " < ", Strings.toString(amount)));
    }

    function getBalance(address account) external view override returns (uint256) {
        return account.balance;
    }
}
