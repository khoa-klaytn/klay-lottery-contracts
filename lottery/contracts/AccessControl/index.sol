// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {AddressSetLib} from "../libs/AddressSetLib.sol";
import {MultiOwnable} from "./MultiOwnable.sol";
import {RoleName} from "./enums.sol";
import {AbstractAccessControl, AbstractRoleControl} from "./abstracts/index.sol";

// ----------- //
// RoleControl //
// ----------- //

error NotRole(RoleName roleName, address sender);

contract RoleControl is AbstractRoleControl, MultiOwnable {
    using AddressSetLib for AddressSetLib.Set;

    mapping(RoleName => AddressSetLib.Set) private mapRoleMemberSet;

    constructor() {
        mapRoleMemberSet[RoleName.Injector].insert(msg.sender);
    }

    function addMember(RoleName roleName, address member) external onlyOwnerMember {
        mapRoleMemberSet[roleName].insert(member);
    }

    function removeMember(RoleName roleName, address member) external onlyOwnerMember {
        mapRoleMemberSet[roleName].remove(member);
    }

    function hasRole(RoleName roleName, address sender) public view returns (bool) {
        return mapRoleMemberSet[roleName].exists(sender);
    }

    function requireRole(RoleName roleName, address sender) external view {
        if (!hasRole(roleName, sender)) {
            revert NotRole(roleName, msg.sender);
        }
    }
}

// ------------- //
// AccessControl //
// ------------- //

contract AccessControl is AbstractAccessControl, RoleControl {

}
