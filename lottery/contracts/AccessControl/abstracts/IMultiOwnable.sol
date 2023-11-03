// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IMultiOwnable {
    function addOwnerMember(address member) external;

    function removeOwnerMember(address member) external;

    function isOwnerMember(address member) external view returns (bool);

    function requireOwnerMember(address sender) external view;
}

abstract contract AbstractMultiOwnable is IMultiOwnable, Ownable {}
