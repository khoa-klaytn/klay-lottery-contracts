// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ThisAddress} from "../ThisAddress.sol";
import {AddressSetLib} from "../libs/AddressSetLib.sol";
import {IContractDependent} from "./interfaces/Consumer.sol";
import {IOwnableContractControl} from "./interfaces/index.sol";
import {ContractName} from "./enum.sol";

error OwnerMismatch();
error NotContractControl();
error NotControlContract(ContractName contractName, address sender);

abstract contract ContractControlConsumer is IContractDependent, Ownable, ThisAddress {
    using AddressSetLib for AddressSetLib.Set;

    address internal contractControlAddress;
    IOwnableContractControl internal contractControl;
    ContractName internal contractName;

    constructor(address _contractControlAddress, ContractName _contractName) {
        _setContractControl(_contractControlAddress, _contractName);
        contractName = _contractName;
    }

    function setContractControl(address _contractControlAddress) external onlyOwner {
        _setContractControl(_contractControlAddress, contractName);
    }

    function _setContractControl(address _contractControlAddress, ContractName _contractName) internal {
        IOwnableContractControl _contractControl = IOwnableContractControl(_contractControlAddress);
        address _owner = owner();
        address _contractControlOwner = _contractControl.owner();
        if (_owner != _contractControlOwner) revert OwnerMismatch();
        contractControlAddress = _contractControlAddress;
        contractControl = _contractControl;

        contractControl.setContractAddress(_contractName, thisAddress);
        addContractDependencies();
    }

    function addContractDependencies() internal virtual;

    function _onContractAddressChange(ContractName contractName, address contractAddress) internal virtual;

    function addContractDependency(ContractName _contractName) internal {
        address contractAddress = contractControl.getContractAddress(_contractName);
        _onContractAddressChange(_contractName, contractAddress);
        contractControl.addDependent(_contractName, thisAddress);
    }

    function onContractAddressChange(
        ContractName _contractName,
        address contractAddress
    ) external override onlyContractControl {
        _onContractAddressChange(_contractName, contractAddress);
    }

    function isControlContract(ContractName contractName, address sender) internal view virtual returns (bool);

    function requireControlContract(ContractName _contractName, address sender) internal view {
        if (!isControlContract(_contractName, sender)) revert NotControlContract(_contractName, msg.sender);
    }

    modifier onlyControlContract(ContractName _contractName) {
        requireControlContract(_contractName, msg.sender);
        _;
    }

    function requireContractControl(address sender) internal view {
        if (sender != contractControlAddress) revert NotContractControl();
    }

    modifier onlyContractControl() {
        requireContractControl(msg.sender);
        _;
    }
}
