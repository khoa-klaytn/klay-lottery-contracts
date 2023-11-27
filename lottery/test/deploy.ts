import { ethers } from "ethers";
import fs from "fs/promises";
import obj_contract_name_config, { TypeContractNameAbi } from "../config/contracts";
import { contracts, provider, startLottery_config, wallets } from "../globals";
import { ConsoleColor, Enum, colorInfo, grayLog, readContract, sendFn } from "../helpers";
import path from "path";
import config from "../config";

// ----- //
// Setup //
// ----- //

const RoleName = Enum("Owner", "Operator", "Injector", "Querier");
const ContractName = Enum("Treasury", "DataFeedConsumer", "VRFConsumer", "SSLottery");

export default async function deploy() {
  // Sync artifacts
  const artifact_promise_arr = Object.entries(obj_contract_name_config).map(
    async ([contract_name, { abi: _abi, ...config }]) => {
      await syncArtifact(contract_name as ContractName, config);
    }
  );
  await Promise.all(artifact_promise_arr);

  // External contracts
  const prepayment_address = findContract("Prepayment");

  // Chain stuff
  let role_control_address = findContract("RoleControl");
  if (!role_control_address) {
    role_control_address = await deployContract("RoleControl", []);
    await sendFn(["owner", "RoleControl", "addMember", [RoleName.Operator, wallets.operator.address]]);
    await sendFn(["owner", "RoleControl", "addMember", [RoleName.Injector, wallets.injector.address]]);
    await sendFn(["owner", "RoleControl", "addMember", [RoleName.Querier, wallets.querier.address]]);
    await sendFn(["owner", "RoleControl", "addMember", [RoleName.Operator, wallets.server.address]]);
    await sendFn(["owner", "RoleControl", "addMember", [RoleName.Querier, wallets.server.address]]);
  }

  let contract_control_address = findContract("ContractControl");
  try {
    if (!contract_control_address)
      contract_control_address = await deployContract("ContractControl", [role_control_address]);
  } catch (err) {
    throw err;
  }

  let klay_lottery_address = findContract("SSLottery");
  let treasury_address = findContract("Treasury");
  if (!treasury_address) {
    treasury_address = await deployContract("Treasury", []);
  }
  await sendFn(["owner", "ContractControl", "setContractAddress", [ContractName.Treasury, treasury_address]]);
  let vrf_consumer_address = findContract("VRFConsumer");
  if (!vrf_consumer_address)
    vrf_consumer_address = await deployContract("VRFConsumer", [
      role_control_address,
      contract_control_address,
      config.args["VRFConsumer._coordinatorAddress"],
      config.args["VRFConsumer._keyHash"],
      config.args["VRFConsumer._callbackGasLimit"],
      prepayment_address,
      config.args["Prepayment.accId"],
    ]);
  await sendFn(["owner", "Prepayment", "addConsumer", [config.args["Prepayment.accId"], vrf_consumer_address]]);
  let dfc_address = findContract("DataFeedConsumer");
  if (!dfc_address)
    dfc_address = await deployContract("DataFeedConsumer", [
      role_control_address,
      contract_control_address,
      config.args["DataFeedConsumer._aggregatorProxyAddress"],
    ]);

  const base_usd = Number(await readContract("querier", "DataFeedConsumer", "queryBaseUsd"));
  const minTicketPriceInUsd = BigInt(Math.round(0.005 * base_usd));
  startLottery_config.ticketPriceInUsd = BigInt(Math.round(0.1 * base_usd));

  if (!klay_lottery_address)
    klay_lottery_address = await deployContract("SSLottery", [
      role_control_address,
      contract_control_address,
      minTicketPriceInUsd,
    ]);
}

// ------- //
// Helpers //
// ------- //

function contractConfig<CName extends ContractName>({
  abi,
  artifact,
}: Omit<ContractConfig<TypeContractNameAbi[CName]>, "bytecode">) {
  let contract_config = `
const abi = ${JSON.stringify(abi)} as const satisfies ContractAbi;

export type Abi = typeof abi;

const config: ContractConfigSync<Abi> = {`;
  contract_config += `
  artifact: "${artifact}",
  abi,`;
  contract_config += `
};

export default config;
`;
  return contract_config;
}

async function writeArtifact(contract_name: ContractName, contract_config: ContractConfigSync<any>) {
  const contract_config_str = contractConfig(contract_config);
  const contract_config_path = path.resolve(__dirname, `../config/contracts/${contract_name}.ts`);
  await fs.writeFile(contract_config_path, contract_config_str);
}

async function syncConfig(contract_name: string, abi: ContractAbi, bytecode: string) {
  obj_contract_name_config[contract_name]["abi"] = abi;
  obj_contract_name_config[contract_name]["bytecode"] = bytecode;
}

async function syncArtifact<CName extends ContractName, CConfig extends ContractConfig<TypeContractNameAbi[CName]>>(
  contract_name: CName,
  { artifact, address }: Omit<CConfig, "abi" | "bytecode">
) {
  const { abi, bytecode } = (await import(artifact, { assert: { type: "json" } })).default as Pick<
    ContractConfig<TypeContractNameAbi[CName]>,
    "abi" | "bytecode"
  >;
  await Promise.all([writeArtifact(contract_name, { abi, artifact }), syncConfig(contract_name, abi, bytecode)]);
  colorInfo("Synced", `${contract_name} artifact`, ConsoleColor.FgGreen);
}

function assignContract(contract_name: ContractName, address: HexStr, abi: ethers.Interface) {
  contracts[contract_name] = new ethers.Contract(address, abi, provider);
}
function findContract<T extends ContractName>(contract_name: T) {
  const { abi } = obj_contract_name_config[contract_name];
  const address = config.Contracts[contract_name];
  if (!address) return;

  const abi_interface = new ethers.Interface(abi);
  assignContract(contract_name, address, abi_interface);
  grayLog(`${contract_name} found: ${address}`);
  return address;
}
async function deployContract<T extends ContractName>(contract_name: T, args: any[]) {
  const { abi, bytecode } = obj_contract_name_config[contract_name] as ContractConfig<TypeContractNameAbi[T]>;
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
