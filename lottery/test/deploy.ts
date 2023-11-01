import { ethers } from "ethers";
import fs from "fs/promises";
import obj_contract_name_config, { TypeContractNameAbi } from "../config/contracts";
import { contracts, provider, startLottery_config, wallets } from "../globals";
import { ConsoleColor, colorInfo, grayLog, readContract, sendFn } from "../helpers";
import path from "path";

// ----- //
// Setup //
// ----- //

export default async function deploy() {
  // Sync artifacts
  const artifact_promise_arr = Object.entries(obj_contract_name_config).map(
    async ([contract_name, { abi: _abi, bytecode: _bytecode, ...config }]) => {
      await syncArtifact(contract_name as ContractName, config);
    }
  );
  await Promise.all(artifact_promise_arr);

  // Chain stuff
  let klay_lottery_address = findContract("SSLottery");
  let rng_address = findContract("VRFConsumer");
  if (!rng_address)
    rng_address = await deployContract("VRFConsumer", [
      obj_contract_name_config.VRFConsumer.args.coordinator,
      obj_contract_name_config.VRFConsumer.args._keyHash,
      obj_contract_name_config.VRFConsumer.args._callbackGasLimit,
    ]);
  let dfc_address = findContract("DataFeedConsumer");
  if (!dfc_address)
    dfc_address = await deployContract("DataFeedConsumer", [
      obj_contract_name_config.DataFeedConsumer.args.aggregatorProxy,
    ]);

  await sendFn(["owner", "DataFeedConsumer", "setQuerier", [wallets.querier.address]]);
  const base_usd = Number(await readContract("querier", "DataFeedConsumer", "queryBaseUsd"));
  const minTicketPriceInUsd = BigInt(Math.round(0.005 * base_usd));
  startLottery_config.ticketPriceInUsd = BigInt(Math.round(0.05 * base_usd));

  if (!klay_lottery_address)
    klay_lottery_address = await deployContract("SSLottery", [rng_address, dfc_address, minTicketPriceInUsd]);

  await sendFn(["owner", "DataFeedConsumer", "setSSLottery", [klay_lottery_address]]);
  await sendFn(["owner", "VRFConsumer", "setRoles", [klay_lottery_address, wallets.querier.address]]);
  await sendFn([
    "owner",
    "SSLottery",
    "setOperatorAndInjectorAddresses",
    [wallets.operator.address, wallets.injector.address],
  ]);
  await sendFn(["owner", "SSLottery", "reset"]);
}

// ------- //
// Helpers //
// ------- //

function contractConfig<CName extends ContractName>({
  abi,
  artifact,
  address,
  args,
  bytecode,
}: ContractConfig<TypeContractNameAbi[CName]>) {
  let contract_config = `
const abi = ${JSON.stringify(abi)} as const satisfies ContractAbi;

export type Abi = typeof abi;

const config: ContractConfig<Abi> = {`;
  if (typeof address !== "undefined")
    contract_config += `
  address: "${address}", // Keep this on top since the others can get long`;
  if (typeof args !== "undefined")
    contract_config += `
  args: ${JSON.stringify(args, (k, v) => (typeof v === "bigint" ? `${v.toString()}n` : v))},`.replace(/"(\d+n)"/, "$1");
  contract_config += `
  artifact: "${artifact}",
  abi,`;
  if (typeof bytecode !== "undefined")
    contract_config += `
  bytecode: "${bytecode}",`;
  contract_config += `
};

export default config;
`;
  return contract_config;
}

async function syncArtifact<CName extends ContractName, CConfig extends ContractConfig<TypeContractNameAbi[CName]>>(
  contract_name: CName,
  { artifact, address, args }: Omit<CConfig, "abi" | "bytecode">
) {
  const { abi, bytecode } = (await import(artifact, { assert: { type: "json" } })).default as Pick<
    ContractConfig<TypeContractNameAbi[CName]>,
    "abi" | "bytecode"
  >;
  const contract_config = contractConfig({ abi, artifact, address, args, bytecode });
  const contract_config_path = path.resolve(__dirname, `../config/contracts/${contract_name}.ts`);
  await fs.writeFile(contract_config_path, contract_config);
  colorInfo("Synced", `${contract_name} artifact`, ConsoleColor.FgGreen);
}

function assignContract(contract_name: ContractName, address: HexStr, abi: ethers.Interface) {
  contracts[contract_name] = new ethers.Contract(address, abi, provider);
}
function findContract<T extends ContractName>(contract_name: T) {
  const { abi, address } = obj_contract_name_config[contract_name];
  if (!address) return;

  const abi_interface = new ethers.Interface(abi);
  assignContract(contract_name, address, abi_interface);
  grayLog(`${contract_name} found: ${address}`);
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
  grayLog(`${contract_name} deployed: ${address}`);
  return address;
}
