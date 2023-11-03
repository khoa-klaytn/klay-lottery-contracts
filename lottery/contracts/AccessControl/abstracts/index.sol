// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {ContractName, RoleName} from "../enums.sol";
import {AbstractMultiOwnable} from "./MultiOwnable.sol";

interface IContractControl {
    function getContractAddress(ContractName contractName) external view returns (address);

    function setContractAddress(ContractName contractName, address contractAddress) external;

    function isControlContract(ContractName contractName, address contractAddress) external view returns (bool);

    function requireControlContract(ContractName contractName, address contractAddress) external view;

    /**
     * @notice Makes msg.sender dependent on contractName
     */
    function addDependent(ContractName contractName) external;

    function removeDependent(ContractName contractName, address contractAddress) external;

    function syncContract(ContractName contractName) external;

    function pushContractAddress(ContractName contractName, address contractAddress) external;
}

abstract contract AbstractContractControl is IContractControl, AbstractMultiOwnable {}

interface IRoleControl {
    function addMember(RoleName roleName, address member) external;

    function removeMember(RoleName roleName, address member) external;

    function hasRole(RoleName roleName, address sender) external view returns (bool);

    function requireRole(RoleName roleName, address sender) external view;
}

abstract contract AbstractRoleControl is IRoleControl, AbstractMultiOwnable {}

abstract contract AbstractAccessControl is AbstractContractControl, AbstractRoleControl {}
