import { ethers } from "ethers";
import obj_contract_name_config from "../config/contracts";
import { contracts, provider, startLottery_config, wallets } from "./globals";
import { readContract, sendFn } from "./helpers";

// ----- //
// Setup //
// ----- //

export async function beforeAll() {
  let klay_lottery_address = findContract("KlayLottery");
  let rng_address = findContract("RandomNumberGenerator");
  if (!rng_address)
    rng_address = await deployContract("RandomNumberGenerator", [
      obj_contract_name_config.RandomNumberGenerator.args.coordinator,
      obj_contract_name_config.RandomNumberGenerator.args._keyHash,
      obj_contract_name_config.RandomNumberGenerator.args._callbackGasLimit,
    ]);
  let dfc_address = findContract("DataFeedConsumer");
  if (!dfc_address)
    dfc_address = await deployContract("DataFeedConsumer", [
      obj_contract_name_config.DataFeedConsumer.args.aggregatorProxy,
    ]);

  await sendFn(["owner", "DataFeedConsumer", "setQuerier", [wallets.querier.address]]);
  const base_usd = Number(await readContract("querier", "DataFeedConsumer", "queryBaseUsd"));
  const minTicketPriceInUsd = BigInt(Math.round(0.005 * base_usd));
  startLottery_config.ticketPriceInUsd = BigInt(Math.round(0.1 * base_usd));

  if (!klay_lottery_address)
    klay_lottery_address = await deployContract("KlayLottery", [rng_address, dfc_address, minTicketPriceInUsd]);

  await sendFn(["owner", "DataFeedConsumer", "setKlayLottery", [klay_lottery_address]]);
  await sendFn(["owner", "RandomNumberGenerator", "setRoles", [klay_lottery_address, wallets.querier.address]]);
  await sendFn([
    "owner",
    "KlayLottery",
    "setOperatorAndInjectorAddresses",
    [wallets.operator.address, wallets.injector.address],
  ]);
  await sendFn(["owner", "KlayLottery", "reset"]);
}

// ------- //
// Helpers //
// ------- //

function assignContract(contract_name: ContractName, address: HexStr, abi: ethers.Interface) {
  contracts[contract_name] = new ethers.Contract(address, abi, provider);
}
function findContract<T extends ContractName>(contract_name: T) {
  const { abi, address } = obj_contract_name_config[contract_name];
  if (!address) return;

  const abi_interface = new ethers.Interface(abi);
  assignContract(contract_name, address, abi_interface);
  console.info(`${contract_name} found @ ${address}`);
  return address;
}
async function deployContract<T extends ContractName>(contract_name: T, args: any[]) {
  const { abi, bytecode } = obj_contract_name_config[contract_name];
  const abi_interface = new ethers.Interface(abi);
  const Contract = new ethers.ContractFactory(abi_interface, bytecode, wallets.owner);
  const contract = await Contract.deploy(...args);
  const tx = contract.deploymentTransaction();
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error(`${contract_name} receipt not found`);
  }
  const address = receipt.contractAddress as HexStr;
  if (!address) {
    throw new Error(`${contract_name} address not found`);
  }
  assignContract(contract_name, address, abi_interface);
  console.info(`${contract_name} deployed @ ${address}`);
  return address;
}
