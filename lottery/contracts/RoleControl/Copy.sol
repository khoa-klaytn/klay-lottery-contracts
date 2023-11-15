// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {AddressSetLib} from "../libs/AddressSetLib.sol";
import {RoleName} from "./enum.sol";

abstract contract RoleCopy {
    mapping(RoleName => AddressSetLib.Set) internal mapRoleMemberSet;
}
