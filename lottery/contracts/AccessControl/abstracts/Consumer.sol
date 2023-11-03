// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ContractName, RoleName} from "../enums.sol";
import {AbstractAccessControl} from "./index.sol";

error OwnerMismatch();

abstract contract ConstructorlessAbstractAccessControlConsumer is Ownable {
    AbstractAccessControl internal accessControl;

    function setAccessControl(address _accessControlAddress) external onlyOwner {
        AbstractAccessControl _accessControl = AbstractAccessControl(_accessControlAddress);
        address _owner = owner();
        address _accessControlOwner = _accessControl.owner();
        require(_owner == _accessControlOwner, "AccessControlConsumer: owner mismatch");
        accessControl = _accessControl;
    }

    function requireOwnerMember(address sender) internal view {
        accessControl.requireOwnerMember(sender);
    }

    modifier onlyOwnerMember() {
        requireOwnerMember(msg.sender);
        _;
    }
}

abstract contract ConstructorlessContractControlConsumer is ConstructorlessAbstractAccessControlConsumer {
    function requireControlContract(ContractName contractName, address sender) internal view {
        accessControl.requireControlContract(contractName, sender);
    }

    modifier onlyControlContract(ContractName contractName) {
        requireControlContract(contractName, msg.sender);
        _;
    }
}

abstract contract ConstructorlessRoleControlConsumer is ConstructorlessAbstractAccessControlConsumer {
    function requireRole(RoleName roleName, address sender) internal view {
        accessControl.requireRole(roleName, sender);
    }

    modifier onlyRole(RoleName roleName) {
        requireRole(roleName, msg.sender);
        _;
    }
}

abstract contract AbstractAccessControlConsumer is ConstructorlessAbstractAccessControlConsumer {
    constructor(address _accessControlAddress) {
        AbstractAccessControl _accessControl = AbstractAccessControl(_accessControlAddress);
        address _owner = owner();
        address _accessControlOwner = _accessControl.owner();
        if (_owner != _accessControlOwner) revert OwnerMismatch();
        accessControl = _accessControl;
    }
}
