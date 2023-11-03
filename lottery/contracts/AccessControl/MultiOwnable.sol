// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {AddressSetLib} from "../libs/AddressSetLib.sol";
import {AbstractMultiOwnable} from "./abstracts/MultiOwnable.sol";

error NotOwnerMember(address sender);

contract MultiOwnable is AbstractMultiOwnable {
    using AddressSetLib for AddressSetLib.Set;
    AddressSetLib.Set internal ownerMemberSet;

    constructor() {
        ownerMemberSet.insert(msg.sender);
    }

    function addOwnerMember(address member) external onlyOwner {
        ownerMemberSet.insert(member);
    }

    function removeOwnerMember(address member) external onlyOwner {
        ownerMemberSet.remove(member);
    }

    function isOwnerMember(address member) public view returns (bool) {
        return ownerMemberSet.exists(member);
    }

    function requireOwnerMember(address sender) public view {
        if (!isOwnerMember(sender)) revert NotOwnerMember(sender);
    }

    modifier onlyOwnerMember() {
        requireOwnerMember(msg.sender);
        _;
    }

    modifier onlyOwnerMemberOrigin() {
        requireOwnerMember(tx.origin);
        _;
    }
}
