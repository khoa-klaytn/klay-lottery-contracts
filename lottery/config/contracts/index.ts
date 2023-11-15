import RoleControl, { type Abi as RoleControlAbi } from "./RoleControl";
import ContractControl, { type Abi as ContractControlAbi } from "./ContractControl";
import VRFConsumer, { type Abi as VRFConsumerAbi } from "./VRFConsumer";
import DataFeedConsumer, { type Abi as DataFeedConsumerAbi } from "./DataFeedConsumer";
import SSLottery, { type Abi as SSLotteryAbi } from "./SSLottery";

const obj_contract_name_config = {
  RoleControl,
  ContractControl,
  VRFConsumer,
  DataFeedConsumer,
  SSLottery,
};

export default obj_contract_name_config;

export type TypeContractNameAbi = {
  RoleControl: RoleControlAbi;
  ContractControl: ContractControlAbi;
  VRFConsumer: VRFConsumerAbi;
  DataFeedConsumer: DataFeedConsumerAbi;
  SSLottery: SSLotteryAbi;
};
