// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";

contract OnlyLotteryable is Ownable {
    address payable public klayLottery;

    modifier onlyKlayLottery() {
        require(msg.sender == klayLottery, "Only KlayLottery");
        _;
    }

    function setLotteryAddress(address _klayLottery) external onlyOwner {
        klayLottery = payable(_klayLottery);
    }
}
