// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {IOwnable} from "../../interfaces/IOwnable.sol";
import {ContractName} from "../enum.sol";

interface IContractControl {
    function getContractAddress(ContractName contractName) external view returns (address);

    function setContractAddress(ContractName contractName, address contractAddress) external;

    function addDependent(ContractName contractName, address dependent) external;

    function removeDependent(ContractName contractName, address dependent) external;
}

interface IOwnableContractControl is IContractControl, IOwnable {}
