// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {RoleName} from "./enums.sol";
import {AbstractAccessControl} from "./abstracts/index.sol";

contract BaseAccessControlConsumer is Ownable {
    AbstractAccessControl internal accessControl;

    constructor(address _accessControlAddress) {
        AbstractAccessControl _accessControl = AbstractAccessControl(_accessControlAddress);
        address _owner = owner();
        address _accessControlOwner = _accessControl.owner();
        require(_owner == _accessControlOwner, "AccessControlConsumer: owner mismatch");
        accessControl = _accessControl;
    }

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

contract RoleControlConsumer is BaseAccessControlConsumer {
    constructor(address _accessControlAddress) BaseAccessControlConsumer(_accessControlAddress) {}

    function requireRole(RoleName roleName, address sender) internal view {
        accessControl.requireRole(roleName, sender);
    }

    modifier onlyRole(RoleName roleName) {
        requireRole(roleName, msg.sender);
        _;
    }
}
