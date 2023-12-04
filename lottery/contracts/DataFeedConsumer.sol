// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {IAggregator} from "@bisonai/orakl-contracts/src/v0.1/interfaces/IAggregator.sol";
import {ContractControlConsumer} from "./ContractControl/Consumer.sol";
import {ContractName} from "./ContractControl/enum.sol";
import {RoleControlConsumer} from "./RoleControl/Consumer.sol";
import {RoleName} from "./RoleControl/enum.sol";
import {IDataFeedConsumer} from "./interfaces/IDataFeedConsumer.sol";

error AnswerNonPositive();

contract DataFeedConsumer is IDataFeedConsumer, ContractControlConsumer, RoleControlConsumer {
    IAggregator internal dataFeed;
    address internal ssLotteryAddress;
    uint8 public constant DECIMALS_CRYPTO = 18;
    uint8 public immutable DECIMALS_USD;
    uint256 public immutable BASE_CRYPTO = 10 ** DECIMALS_CRYPTO;
    uint256 public immutable BASE_USD;

    constructor(address _roleControlAddress, address _contractControlAddress, address _aggregatorProxyAddress)
        RoleControlConsumer(_roleControlAddress)
        ContractControlConsumer(_contractControlAddress, ContractName.DataFeedConsumer)
    {
        dataFeed = IAggregator(_aggregatorProxyAddress);
        uint8 decimals_usd = dataFeed.decimals();
        DECIMALS_USD = decimals_usd;
        uint256 base_usd = 10 ** DECIMALS_USD;
        BASE_USD = base_usd;
    }

    function addRoleDependencies() internal override {}

    function addContractDependencies() internal override {
        addContractDependency(ContractName.SSLottery);
    }

    function _onContractAddressChange(ContractName contractName, address contractAddress) internal override {
        if (contractName == ContractName.SSLottery && ssLotteryAddress != contractAddress) {
            ssLotteryAddress = contractAddress;
        }
    }

    function isControlContract(ContractName contractName, address sender) internal view override returns (bool) {
        if (contractName == ContractName.SSLottery) {
            return ssLotteryAddress == sender;
        }
        return false;
    }

    // ------------------- //
    // SSLottery functions //
    // ------------------- //

    function convertCryptoUsd(uint256 crypto)
        external
        view
        override
        onlyControlContract(ContractName.SSLottery)
        returns (uint256 usd)
    {
        return _convertCryptoUsd(crypto);
    }

    function convertUsdCrypto(uint256 usd)
        external
        view
        override
        onlyControlContract(ContractName.SSLottery)
        returns (uint256 crypto)
    {
        return _convertUsdCrypto(usd);
    }

    // ------------------ //
    // internal functions //
    // ------------------ //

    function latestData() internal view returns (uint256) {
        (, int256 answer_,,,) = dataFeed.latestRoundData();
        requirePositive(answer_);
        return uint256(answer_);
    }

    function _convertCryptoUsd(uint256 crypto) internal view returns (uint256 usd) {
        usd = (crypto * latestData()) / BASE_CRYPTO;
    }

    function _convertUsdCrypto(uint256 usd) internal view returns (uint256 crypto) {
        crypto = (usd * BASE_CRYPTO) / latestData();
    }

    function requirePositive(int256 answer) internal pure {
        if (answer <= 0) {
            revert AnswerNonPositive();
        }
    }
}
