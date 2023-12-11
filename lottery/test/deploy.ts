import { ethers } from "ethers";
import obj_contract_name_artifact from "../sync/artifacts";
import { contracts, provider, startLottery_config, wallets } from "../globals";
import { Enum, grayLog, readContract, sendFn, waitResponse } from "../helpers";
import config from "../config";
import { syncObjContractNamePartObj } from "../sync";

// ----- //
// Setup //
// ----- //

const RoleName = Enum("Owner", "Operator", "Injector");
const ContractName = Enum("Treasury", "DataFeedConsumer", "VRFConsumer", "SSLottery");

export default async function deploy() {
  // External contracts
  const prepayment_address = config.args["Prepayment.address"];
  findContract("Prepayment", prepayment_address);
  const treasury_address = config.args["Treasury.address"];
  findContract("Treasury", treasury_address);

  // Chain stuff
  const role_control_redeployed = await maybeDeployContract("RoleControl", []);
  if (role_control_redeployed) {
    await sendFn(["owner", "RoleControl", "addMember", [RoleName.Operator, wallets.operator.address]]);
    await sendFn(["owner", "RoleControl", "addMember", [RoleName.Injector, wallets.injector.address]]);
    await sendFn(["owner", "RoleControl", "addMember", [RoleName.Operator, wallets.server.address]]);
  }
  const role_control_address = config.obj_contract_name_part_obj.RoleControl.address;

  await maybeDeployContract("ContractControl", [role_control_address]);
  const contract_control_address = config.obj_contract_name_part_obj.ContractControl.address;

  await sendFn(["owner", "ContractControl", "setContractAddress", [ContractName.Treasury, treasury_address]]);
  const prepayment_acc_id = config.args["Prepayment.accId"];
  await maybeDeployContract("VRFConsumer", [
    role_control_address,
    contract_control_address,
    config.args["VRFConsumer._coordinatorAddress"],
    config.args["VRFConsumer._keyHash"],
    config.args["VRFConsumer._callbackGasLimit"],
    prepayment_address,
    prepayment_acc_id,
  ]);
  const vrf_consumer_address = config.obj_contract_name_part_obj.VRFConsumer.address;
  await sendFn(["owner", "Prepayment", "addConsumer", [prepayment_acc_id, vrf_consumer_address]]);
  await maybeDeployContract("DataFeedConsumer", [
    role_control_address,
    contract_control_address,
    config.args["DataFeedConsumer._aggregatorProxyAddress"],
  ]);

  const base_usd = Number(await readContract("owner", "DataFeedConsumer", "BASE_USD"));
  const minTicketPriceInUsd = BigInt(Math.round(0.005 * base_usd));
  startLottery_config.ticketPriceInUsd = BigInt(Math.round(0.1 * base_usd));
  await maybeDeployContract("SSLottery", [role_control_address, contract_control_address, minTicketPriceInUsd]);

  await syncObjContractNamePartObj();
}

// ------- //
// Helpers //
// ------- //

function assignContract(contract_name: ContractName, address: HexStr, abi: ethers.Interface) {
  contracts[contract_name] = new ethers.Contract(address, abi, provider);
}
/**
 * @returns Whether contract was redeployed
 */
async function maybeDeployContract<T extends PrivateContractName>(contract_name: T, args: any[]): Promise<boolean> {
  const { address, redeploy } = config.obj_contract_name_part_obj[contract_name as PrivateContractName];

  if (redeploy) {
    await deployContract(contract_name, args);
    return true;
  }

  findContract(contract_name, address);
  return false;
}
function findContract<T extends ContractName>(contract_name: T, address: HexStr) {
  const { abi } = obj_contract_name_artifact[contract_name];
  const abi_interface = new ethers.Interface(abi);
  assignContract(contract_name, address, abi_interface);
  grayLog(`${contract_name} found: ${address}`);
}
async function deployContract<T extends ContractName>(contract_name: T, args: any[]) {
  const { abi, bytecode } = obj_contract_name_artifact[contract_name];
  const abi_interface = new ethers.Interface(abi);
  const Contract = new ethers.ContractFactory(abi_interface, bytecode, wallets.owner);
  const contract = await Contract.deploy(...args);
  const _response = contract.deploymentTransaction();
  const [, receipt] = await waitResponse(_response);
  const address = receipt.contractAddress as HexStr;
  if (!address) {
    throw new Error(`${contract_name} address not found`);
  }
  const block = await receipt.getBlock();
  config.obj_contract_name_part_obj[contract_name as PrivateContractName].address = address;
  config.obj_contract_name_part_obj[contract_name as PrivateContractName].startBlock = block.number;
  assignContract(contract_name, address, abi_interface);
  grayLog(`${contract_name} deployed: ${address}`);
}
