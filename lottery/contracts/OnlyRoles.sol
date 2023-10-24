// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";

error NotKlayLottery();
error NotQuerier();

contract OnlyRoles is Ownable {
    address public klayLottery;
    address public querier;

    function setRoles(address _klayLottery, address _querier) external onlyOwner {
        setKlayLotteryAddress(_klayLottery);
        setQuerierAddress(_querier);
    }

    function requireKlayLottery() private view {
        if (msg.sender != klayLottery) {
            revert NotKlayLottery();
        }
    }

    modifier onlyKlayLottery() {
        requireKlayLottery();
        _;
    }

    function setKlayLotteryAddress(address _klayLottery) public onlyOwner {
        klayLottery = _klayLottery;
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

    function setQuerierAddress(address _querier) public onlyOwner {
        querier = _querier;
    }
}
