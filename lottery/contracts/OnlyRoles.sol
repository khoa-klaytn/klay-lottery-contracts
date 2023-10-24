// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";

error NotKlayLottery();
error NotQuerier();
error NotKlayLotteryOrQuerier();

contract OnlyRoles is Ownable {
    address public klayLottery;
    address public querier;

    function setRoles(address _klayLottery, address _querier) external onlyOwner {
        setKlayLottery(_klayLottery);
        setQuerier(_querier);
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

    function setKlayLottery(address _klayLottery) public onlyOwner {
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

    function setQuerier(address _querier) public onlyOwner {
        querier = _querier;
    }

    modifier onlyKlayLotteryOrQuerier() {
        if ((msg.sender != klayLottery) && (msg.sender != querier)) {
            revert NotKlayLotteryOrQuerier();
        }
        _;
    }
}
