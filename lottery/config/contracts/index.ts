import RandomNumberGenerator, { type Abi as RandomNumberGeneratorAbi } from "./RandomNumberGenerator";
import DataFeedConsumer, { type Abi as DataFeedConsumerAbi } from "./DataFeedConsumer";
import KlayLottery, { type Abi as KlayLotteryAbi } from "./KlayLottery";

const obj_contract_name_config = {
  RandomNumberGenerator,
  DataFeedConsumer,
  KlayLottery,
};

export default obj_contract_name_config;

export type TypeContractNameAbi = {
  RandomNumberGenerator: RandomNumberGeneratorAbi;
  DataFeedConsumer: DataFeedConsumerAbi;
  KlayLottery: KlayLotteryAbi;
};
