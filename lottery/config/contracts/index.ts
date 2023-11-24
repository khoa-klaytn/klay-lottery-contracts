import RoleControl, { type Abi as RoleControlAbi } from "./RoleControl";
import ContractControl, { type Abi as ContractControlAbi } from "./ContractControl";
import Treasury, { type Abi as TreasuryAbi } from "./Treasury";
import VRFConsumer, { type Abi as VRFConsumerAbi } from "./VRFConsumer";
import DataFeedConsumer, { type Abi as DataFeedConsumerAbi } from "./DataFeedConsumer";
import SSLottery, { type Abi as SSLotteryAbi } from "./SSLottery";
import Prepayment, { type Abi as PrepaymentAbi } from "./Prepayment";

const obj_contract_name_config = {

  RoleControl,
  ContractControl,
  Treasury,
  VRFConsumer,
  DataFeedConsumer,
  SSLottery,
  Prepayment
};

export default obj_contract_name_config;

export type TypeContractNameAbi = {
  RoleControl: RoleControlAbi;
  ContractControl: ContractControlAbi;
  Treasury: TreasuryAbi;
  VRFConsumer: VRFConsumerAbi;
  DataFeedConsumer: DataFeedConsumerAbi;
  SSLottery: SSLotteryAbi;
  Prepayment: PrepaymentAbi;
};
