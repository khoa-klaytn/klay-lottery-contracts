// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {AddressSetLib} from "../libs/AddressSetLib.sol";
import {MultiOwnable} from "./MultiOwnable.sol";
import {ContractName, RoleName} from "./enums.sol";
import {AbstractAccessControl, AbstractContractControl, AbstractRoleControl} from "./abstracts/index.sol";

// --------------- //
// ContractControl //
// --------------- //

error NotControlContract(ContractName contractName, address sender);

contract ContractControl is AbstractContractControl, MultiOwnable {
    using AddressSetLib for AddressSetLib.Set;

    mapping(ContractName => address) private mapContractNameAddress;

    function getContractAddress(ContractName contractName) external view override returns (address) {
        return mapContractNameAddress[contractName];
    }

    /**
     * @dev To be called by the contract itself, have owner as tx.origin
     */
    function setContractAddress(ContractName contractName) external override onlyOwnerMemberOrigin {
        mapContractNameAddress[contractName] = msg.sender;
    }

    function isControlContract(ContractName contractName, address sender) public view override returns (bool) {
        return mapContractNameAddress[contractName] == sender;
    }

    function requireControlContract(ContractName contractName, address sender) external view override {
        if (!isControlContract(contractName, sender)) {
            revert NotControlContract(contractName, msg.sender);
        }
    }
}

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

    function addMember(RoleName roleName, address member) external override onlyOwnerMember {
        mapRoleMemberSet[roleName].insert(member);
    }

    function removeMember(RoleName roleName, address member) external override onlyOwnerMember {
        mapRoleMemberSet[roleName].remove(member);
    }

    function hasRole(RoleName roleName, address sender) public view override returns (bool) {
        return mapRoleMemberSet[roleName].exists(sender);
    }

    function requireRole(RoleName roleName, address sender) external view override {
        if (!hasRole(roleName, sender)) {
            revert NotRole(roleName, msg.sender);
        }
    }
}

// ------------- //
// AccessControl //
// ------------- //

contract AccessControl is AbstractAccessControl, ContractControl, RoleControl {

}
