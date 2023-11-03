// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {RoleName} from "../enums.sol";
import {AbstractMultiOwnable} from "./IMultiOwnable.sol";

interface IRoleControl {
    function addMember(RoleName roleName, address member) external;

    function removeMember(RoleName roleName, address member) external;

    function hasRole(RoleName roleName, address sender) external view returns (bool);

    function requireRole(RoleName roleName, address sender) external view;
}

abstract contract AbstractRoleControl is IRoleControl, AbstractMultiOwnable {}

abstract contract AbstractAccessControl is AbstractRoleControl {}
