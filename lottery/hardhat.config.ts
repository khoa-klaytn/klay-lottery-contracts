import "dotenv/config";
import type { HardhatUserConfig, NetworkUserConfig } from "hardhat/types";
import "@nomicfoundation/hardhat-ethers";
import "hardhat-abi-exporter";
import "hardhat-contract-sizer";
import "solidity-coverage";
import { beforeAll } from "./test/setup";

const testnet: NetworkUserConfig = {
  url: "https://public-en-baobab.klaytn.net/",
  chainId: 1001,
  accounts: [process.env.KEY_TESTNET!],
};

const mainnet: NetworkUserConfig = {
  url: "https://public-en-cypress.klaytn.net/",
  chainId: 8217,
  accounts: [process.env.KEY_MAINNET!],
};

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      gas: 120000000,
      blockGasLimit: 0x1fffffffffffff,
    },
    testnet,
    mainnet,
  },
  solidity: {
    version: "0.8.16",
    settings: {
      optimizer: {
        enabled: true,
        runs: 99999,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  abiExporter: {
    path: "./data/abi",
    clear: true,
    flat: false,
  },
  mocha: {
    rootHooks: {
      beforeAll,
    },
    grep: process.env.GREP,
    timeout: 100000,
  },
};

export default config;
