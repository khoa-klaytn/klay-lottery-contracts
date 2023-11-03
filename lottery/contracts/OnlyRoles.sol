// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";

error NotSSLottery();

contract OnlyRoles is Ownable {
    address public ssLottery;

    function requireSSLottery() private view {
        if (msg.sender != ssLottery) {
            revert NotSSLottery();
        }
    }

    modifier onlySSLottery() {
        requireSSLottery();
        _;
    }

    function setSSLottery(address _ssLottery) public onlyOwner {
        ssLottery = _ssLottery;
    }
}
