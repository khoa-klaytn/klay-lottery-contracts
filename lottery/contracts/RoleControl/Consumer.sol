// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ThisAddress} from "../ThisAddress.sol";
import {AddressSetLib} from "../libs/AddressSetLib.sol";
import {IRoleDependent} from "./interfaces/Consumer.sol";
import {IOwnableRoleControl} from "./interfaces/index.sol";
import {RoleName} from "./enum.sol";
import {RoleCopy} from "./Copy.sol";

error OwnerMismatch();
error NotRoleControl();
error NotRole(RoleName roleName, address sender);

abstract contract RoleControlConsumer is IRoleDependent, RoleCopy, Ownable, ThisAddress {
    using AddressSetLib for AddressSetLib.Set;

    address internal roleControlAddress;
    IOwnableRoleControl internal roleControl;

    constructor(address _roleControlAddress) {
        _setRoleControl(_roleControlAddress);
    }

    function setRoleControl(address _roleControlAddress) external onlyOwner {
        _setRoleControl(_roleControlAddress);
    }

    function _setRoleControl(address _roleControlAddress) internal {
        IOwnableRoleControl _roleControl = IOwnableRoleControl(_roleControlAddress);
        address _owner = owner();
        address _roleControlOwner = _roleControl.owner();
        if (_owner != _roleControlOwner) revert OwnerMismatch();
        roleControlAddress = _roleControlAddress;
        roleControl = _roleControl;
        addRoleDependencies();
    }

    function addRoleDependencies() internal virtual;

    function addRoleDependency(RoleName roleName) internal {
        address[] memory memberKeyList = roleControl.memberKeyList(roleName);
        for (uint256 j = 0; j < memberKeyList.length; j++) {
            mapRoleMemberSet[roleName].insert(memberKeyList[j]);
        }
        roleControl.addDependent(roleName, thisAddress);
    }

    function onMemberAdd(RoleName roleName, address member) external override onlyRoleControl {
        mapRoleMemberSet[roleName].insert(member);
    }

    function onMemberRemove(RoleName roleName, address member) external override onlyRoleControl {
        mapRoleMemberSet[roleName].remove(member);
    }

    function hasRole(RoleName roleName, address sender) public view returns (bool) {
        return mapRoleMemberSet[roleName].exists(sender);
    }

    function requireRole(RoleName roleName, address sender) internal view {
        if (!hasRole(roleName, sender)) {
            revert NotRole(roleName, msg.sender);
        }
    }

    modifier onlyRole(RoleName roleName) {
        requireRole(roleName, msg.sender);
        _;
    }

    function requireRoleControl(address sender) internal view {
        if (sender != roleControlAddress) revert NotRoleControl();
    }

    modifier onlyRoleControl() {
        requireRoleControl(msg.sender);
        _;
    }
}
