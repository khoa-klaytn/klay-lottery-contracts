// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {ConstructorlessAbstractAccessControlConsumer} from "./abstracts/Consumer.sol";
import {ContractName, RoleName} from "./enums.sol";

interface IDependent {
    function onContractAddressChange(ContractName contractName, address contractAddress) external;
}

error NotAccessControl();

abstract contract DependentAccessControlConsumer is IDependent, ConstructorlessAbstractAccessControlConsumer {
    address private immutable accessControlAddress;

    constructor(address _accessControlAddress) {
        accessControlAddress = _accessControlAddress;
    }

    function onContractAddressChange() external virtual onlyAccessControl {}

    function requireAccessControl(address sender) internal view {
        if (sender != accessControlAddress) revert NotAccessControl();
    }

    modifier onlyAccessControl() {
        requireAccessControl(msg.sender);
        _;
    }
}
