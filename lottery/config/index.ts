import mainnet_private_config from "./mainnet.private";
import mainnet_public_config from "./mainnet.public";
import testnet_private_config from "./testnet.private";
import testnet_public_config from "./testnet.public";

const config =
  process.env.HARDHAT_NETWORK === "mainnet"
    ? {
        ...mainnet_public_config,
        ...mainnet_private_config,
        args: {
          ...mainnet_public_config.args,
          ...mainnet_private_config.args,
        },
      }
    : {
        ...testnet_public_config,
        ...testnet_private_config,
        args: {
          ...testnet_public_config.args,
          ...testnet_private_config.args,
        },
      };

export default config;
