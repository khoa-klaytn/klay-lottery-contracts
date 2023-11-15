// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {ContractName} from "../enum.sol";

interface IContractDependent {
    function onContractAddressChange(ContractName contractName, address contractAddress) external;
}
