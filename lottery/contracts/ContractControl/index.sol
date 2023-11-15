// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {RoleControlConsumer} from "../RoleControl/Consumer.sol";
import {RoleName} from "../RoleControl/enum.sol";
import {AddressSetLib} from "../libs/AddressSetLib.sol";
import {ContractName} from "./enum.sol";
import {IContractControl} from "./interfaces/index.sol";
import {IContractDependent} from "./interfaces/Consumer.sol";

error NotOwnerMember(address sender);

contract ContractControl is IContractControl, RoleControlConsumer {
    using AddressSetLib for AddressSetLib.Set;

    mapping(ContractName => address) private mapContractNameAddress;
    mapping(ContractName => AddressSetLib.Set) private mapContractNameDependentSet;

    constructor(address _roleControlAddress) RoleControlConsumer(_roleControlAddress) {}

    function addRoleDependencies() internal override {
        addRoleDependency(RoleName.Owner);
    }

    function getContractAddress(ContractName contractName) external view override returns (address) {
        return mapContractNameAddress[contractName];
    }

    function syncContract(ContractName contractName) internal {
        address[] memory dependentKeyList = mapContractNameDependentSet[contractName].keyList;
        if (dependentKeyList.length == 0) return;

        address contractAddress = mapContractNameAddress[contractName];
        uint256 dependentKeyListLength = dependentKeyList.length;
        for (uint256 i = 0; i < dependentKeyListLength; i++) {
            address dependent = dependentKeyList[i];
            IContractDependent(dependent).onContractAddressChange(contractName, contractAddress);
        }
    }

    function setContractAddress(
        ContractName contractName,
        address contractAddress
    ) external override onlyOwnerMemberOrigin {
        mapContractNameAddress[contractName] = contractAddress;
        syncContract(contractName);
    }

    function addDependent(ContractName contractName, address dependent) external override onlyOwnerMemberOrigin {
        mapContractNameDependentSet[contractName].insert(dependent);
    }

    function removeDependent(ContractName contractName, address dependent) external override onlyRole(RoleName.Owner) {
        mapContractNameDependentSet[contractName].remove(dependent);
    }

    modifier onlyOwnerMemberOrigin() {
        requireRole(RoleName.Owner, tx.origin);
        _;
    }
}
