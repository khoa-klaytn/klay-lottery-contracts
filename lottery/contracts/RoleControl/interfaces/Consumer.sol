// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {RoleName} from "../enum.sol";

interface IRoleDependent {
    function onMemberAdd(RoleName roleName, address member) external;

    function onMemberRemove(RoleName roleName, address member) external;
}
