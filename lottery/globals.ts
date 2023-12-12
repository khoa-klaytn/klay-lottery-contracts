import { ethers } from "ethers";
import config from "./config";

const providerUrl = "https://public-en-baobab.klaytn.net/";
require("@openzeppelin/test-helpers/configure")({
  provider: providerUrl,
});

export const provider = new ethers.JsonRpcProvider(providerUrl);

export const wallets: Record<WalletName, ethers.Wallet> = {} as any;
Object.entries(config.Wallets).forEach(([wallet_name, wallet_key]) => {
  wallets[wallet_name] = new ethers.Wallet(wallet_key, provider);
});

export const contracts: Record<ContractName, ethers.Contract> = {} as any;

export const startLottery_config = {
  discountDivisor: "2000",
  winnersPortion: "1000",
  burnPortion: "8000",
  rewardPortions: ["1000", "1125", "1250", "1375", "1625", "2625"], // allWinners get 1000
  ticketPriceInUsd: 0n,
  initialFree: 100n,
};
