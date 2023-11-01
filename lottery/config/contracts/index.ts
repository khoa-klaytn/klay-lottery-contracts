import VRFConsumer, { type Abi as VRFConsumerAbi } from "./VRFConsumer";
import DataFeedConsumer, { type Abi as DataFeedConsumerAbi } from "./DataFeedConsumer";
import SSLottery, { type Abi as SSLotteryAbi } from "./SSLottery";

const obj_contract_name_config = {
  VRFConsumer,
  DataFeedConsumer,
  SSLottery,
};

export default obj_contract_name_config;

export type TypeContractNameAbi = {
  VRFConsumer: VRFConsumerAbi;
  DataFeedConsumer: DataFeedConsumerAbi;
  SSLottery: SSLotteryAbi;
};
