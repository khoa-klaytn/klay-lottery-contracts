// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AddressSetLib} from "../libs/AddressSetLib.sol";
import {RoleName} from "./enum.sol";
import {RoleCopy} from "./Copy.sol";
import {IRoleControl} from "./interfaces/index.sol";
import {IRoleDependent} from "./interfaces/Consumer.sol";

error NotOwnerMember(address sender);

contract RoleControl is IRoleControl, RoleCopy, Ownable {
    using AddressSetLib for AddressSetLib.Set;

    mapping(RoleName => AddressSetLib.Set) private mapRoleDependentSet;

    constructor() {
        mapRoleMemberSet[RoleName.Owner].insert(msg.sender);
    }

    function memberKeyList(RoleName roleName) external view returns (address[] memory) {
        return mapRoleMemberSet[roleName].keyList;
    }

    function addMember(RoleName roleName, address member) external override onlyOwnerMember {
        requireOwnerToChangeOwnerMember(roleName);
        mapRoleMemberSet[roleName].insert(member);

        address[] memory dependents = mapRoleDependentSet[roleName].keyList;
        for (uint256 i = 0; i < dependents.length; i++) {
            IRoleDependent(dependents[i]).onMemberAdd(roleName, member);
        }
    }

    function removeMember(RoleName roleName, address member) external override onlyOwnerMember {
        requireOwnerToChangeOwnerMember(roleName);
        mapRoleMemberSet[roleName].remove(member);

        address[] memory dependents = mapRoleDependentSet[roleName].keyList;
        for (uint256 i = 0; i < dependents.length; i++) {
            IRoleDependent(dependents[i]).onMemberRemove(roleName, member);
        }
    }

    function requireOwnerToChangeOwnerMember(RoleName roleName) private view {
        if (roleName == RoleName.Owner) {
            _checkOwner();
        }
    }

    function addDependent(RoleName roleName, address dependent) external override onlyOwnerMemberOrigin {
        mapRoleDependentSet[roleName].insert(dependent);
    }

    function removeDependent(RoleName roleName, address dependent) external override onlyOwnerMember {
        mapRoleDependentSet[roleName].remove(dependent);
    }

    function requireOwnerMember(address sender) internal view {
        if (!mapRoleMemberSet[RoleName.Owner].exists(sender)) revert NotOwnerMember(sender);
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
