// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";

error NotSSLottery();
error NotQuerier();
error NotSSLotteryOrQuerier();

contract OnlyRoles is Ownable {
    address public ssLottery;
    address public querier;

    function setRoles(address _ssLottery, address _querier) external onlyOwner {
        setSSLottery(_ssLottery);
        setQuerier(_querier);
    }

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

    function requireQuerier() private view {
        if (msg.sender != querier) {
            revert NotQuerier();
        }
    }

    modifier onlyQuerier() {
        requireQuerier();
        _;
    }

    function setQuerier(address _querier) public onlyOwner {
        querier = _querier;
    }

    modifier onlySSLotteryOrQuerier() {
        if ((msg.sender != ssLottery) && (msg.sender != querier)) {
            revert NotSSLotteryOrQuerier();
        }
        _;
    }
}
