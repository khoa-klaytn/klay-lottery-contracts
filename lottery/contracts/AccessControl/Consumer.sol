// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ContractName, RoleName} from "./enums.sol";
import {AbstractAccessControl} from "./abstracts/index.sol";
import {AbstractAccessControlConsumer, ConstructorlessContractControlConsumer, ConstructorlessRoleControlConsumer} from "./abstracts/Consumer.sol";

abstract contract ContractControlConsumer is AbstractAccessControlConsumer, ConstructorlessContractControlConsumer {
    constructor(address _accessControlAddress) AbstractAccessControlConsumer(_accessControlAddress) {}
}

abstract contract RoleControlConsumer is AbstractAccessControlConsumer, ConstructorlessRoleControlConsumer {
    constructor(address _accessControlAddress) AbstractAccessControlConsumer(_accessControlAddress) {}
}

abstract contract AccessControlConsumer is
    AbstractAccessControlConsumer,
    ConstructorlessContractControlConsumer,
    ConstructorlessRoleControlConsumer
{
    constructor(address _accessControlAddress) AbstractAccessControlConsumer(_accessControlAddress) {}
}
