// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {RoleName} from "../RoleControl/enum.sol";
import {SSLottery} from "./index.sol";

contract TestSSLottery is SSLottery {
    constructor(
        address _roleControlAddress,
        address _contractControlAddress,
        uint256 _minTicketPriceInUsd
    ) SSLottery(_roleControlAddress, _contractControlAddress, _minTicketPriceInUsd) {}

    function reset() external onlyRole(RoleName.Owner) {
        currentLotteryId = 0;
        currentTicketId = 0;
    }

    /**
     * Closes lottery regardless of endTime
     * @param _lotteryId Lottery ID
     */
    function forceCloseLottery(uint256 _lotteryId) external onlyRole(RoleName.Operator) nonReentrant {
        requireOpen(_lotteryId);
        _closeLottery(_lotteryId);
    }

    function setFinalNumberAndMakeLotteryClaimable(
        uint256 _lotteryId,
        bool _autoInjection,
        uint32 _finalNumber
    ) external onlyRole(RoleName.Operator) nonReentrant {
        requireClose(_lotteryId);
        requireValidTicketNumber(_finalNumber, _lotteries[_lotteryId].numBrackets);
        makeLotteryClaimable(_lotteryId, _autoInjection, _finalNumber);
    }

    function viewLotteries() external view returns (Lottery[] memory lotteries) {
        for (uint256 i = 0; i < currentLotteryId; i++) {
            lotteries[i] = _lotteries[i];
        }
        return lotteries;
    }

    function viewTickets() external view returns (Ticket[] memory tickets) {
        for (uint256 i = 0; i < currentTicketId; i++) {
            tickets[i] = _tickets[i];
        }
        return tickets;
    }

    function viewNumberTickets(uint256 lotteryId, uint32 ticketNumber) external view returns (uint256) {
        return _numberTicketsPerLotteryId[lotteryId][ticketNumber];
    }

    function viewUserTicketIds(address user, uint256 lotteryId) external view returns (uint256[] memory) {
        return _userTicketIdsPerLotteryId[user][lotteryId];
    }
}
