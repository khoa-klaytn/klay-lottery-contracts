import "dotenv/config";
import type { HardhatUserConfig } from "hardhat/types";
import "@nomicfoundation/hardhat-ethers";
import "hardhat-abi-exporter";
import "hardhat-contract-sizer";
import "solidity-coverage";
import mainnet_private_config from "./config/mainnet.private";
import mainnet_public_config from "./config/mainnet.public";
import testnet_private_config from "./config/testnet.private";
import testnet_public_config from "./config/testnet.public";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      gas: 120000000,
      blockGasLimit: 0x1fffffffffffff,
    },
    testnet: {
      url: testnet_public_config.Url,
      chainId: testnet_public_config.ChainId,
      accounts: [testnet_private_config.Wallets.owner],
    },
    mainnet: {
      url: mainnet_public_config.Url,
      chainId: mainnet_public_config.ChainId,
      accounts: [mainnet_private_config.Wallets.owner],
    },
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
      beforeAll: async () => {
        const deploy = await require("./test/deploy").default;
        await deploy();
      },
    },
    grep: process.env.GREP,
    timeout: 100000,
  },
};

export default config;
