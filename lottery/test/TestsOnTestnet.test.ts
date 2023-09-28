import { ethers } from "ethers";
import accountsConfig from "./accounts.json";
import contractsConfig from "./contracts.json";

const provider = new ethers.providers.JsonRpcProvider("https://public-en-baobab.klaytn.net/");

type AccountName = keyof typeof accountsConfig;
const wallets: Record<AccountName, ethers.Wallet> = {} as any;
Object.entries(accountsConfig).forEach(([name, privateKey]) => {
  wallets[name] = new ethers.Wallet(privateKey, provider);
});

type ContractName = keyof typeof contractsConfig;
const contracts: Record<ContractName, ethers.Contract> = {} as any;
const contractPromises = Object.entries(contractsConfig).map(async ([name, { address, abi }]) => {
  const abiJson = (await import(abi)).default;
  contracts[name] = new ethers.Contract(address, abiJson, provider);
});

async function sendTransaction(
  accountName: AccountName,
  contractName: ContractName,
  functionName: string,
  args: any[],
) {
  const signer = contracts[contractName].connect(wallets[accountName]);
  const fn = signer.functions[functionName];
  const response = await fn(...args);
  console.log(`Transaction sent: ${response.hash}`);
  return response as ethers.providers.TransactionResponse;
}
async function waitResponse(response: ethers.providers.TransactionResponse) {
  await response.wait(1);
}
(async () => {
  await Promise.all(contractPromises);

  const setLotteryAddressResponse = await sendTransaction("alice", "RandomNumberGenerator", "setLotteryAddress", [
    contracts.KlayLottery.address,
  ]);
  await waitResponse(setLotteryAddressResponse);

  const setRolesResponse = await sendTransaction("alice", "KlayLottery", "setOperatorAndTreasuryAndInjectorAddresses", [
    wallets.operator.address,
    wallets.treasury.address,
    wallets.injector.address,
  ]);
  await waitResponse(setRolesResponse);
})().catch(console.error);
