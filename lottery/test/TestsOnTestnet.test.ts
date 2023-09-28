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
  contracts[name] = new ethers.Contract(address, abiJson, wallets.alice);
});

async function sendTransaction(
  accountName: AccountName,
  contractName: ContractName,
  functionName: string,
  args: any[],
  overrides?: ethers.providers.TransactionRequest
) {
  const fn = contracts[contractName].populateTransaction[functionName];
  const unsignedTx = await fn(...args);
  const wallet = wallets[accountName];
  const response = await wallet.sendTransaction({ ...unsignedTx, ...overrides });
  return response;
}
async function logResponse(response: ethers.providers.TransactionResponse) {
  console.log(`Transaction signed and sent: ${response.hash}`);
  // wait for block
  await response.wait(1);
  console.log(`Transaction has been mined at blocknumber: ${response.blockNumber}`);
}
(async () => {
  await Promise.all(contractPromises);

  const setLotteryAddressResponse = await sendTransaction("alice", "RandomNumberGenerator", "setLotteryAddress", [
    contracts.KlayLottery.address,
  ]);
  await logResponse(setLotteryAddressResponse);

  const setRolesResponse = await sendTransaction("alice", "KlayLottery", "setOperatorAndTreasuryAndInjectorAddresses", [
    wallets.operator.address,
    wallets.treasury.address,
    wallets.injector.address,
  ]);
  await logResponse(setRolesResponse);
})().catch(console.error);
