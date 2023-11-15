// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {IOwnable} from "../../interfaces/IOwnable.sol";
import {RoleName} from "../enum.sol";

interface IRoleControl {
    function memberKeyList(RoleName roleName) external returns (address[] memory);

    function addMember(RoleName roleName, address member) external;

    function removeMember(RoleName roleName, address member) external;

    function addDependent(RoleName roleName, address dependent) external;

    function removeDependent(RoleName roleName, address dependent) external;
}

interface IOwnableRoleControl is IRoleControl, IOwnable {}
