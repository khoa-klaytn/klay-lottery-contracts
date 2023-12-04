import ContractControl_artifact from "../artifacts/contracts/ContractControl/index.sol/ContractControl.json";
import DataFeedConsumer_artifact from "../artifacts/contracts/DataFeedConsumer.sol/DataFeedConsumer.json";
import RoleControl_artifact from "../artifacts/contracts/RoleControl/index.sol/RoleControl.json";
import Prepayment_artifact from "../artifacts/@bisonai/orakl-contracts/src/v0.1/interfaces/IPrepayment.sol/IPrepayment.json";
import SSLottery_artifact from "../artifacts/contracts/SSLottery/Test.sol/TestSSLottery.json";
import Treasury_artifact from "../artifacts/contracts/Treasury.sol/Treasury.json";
import VRFConsumer_artifact from "../artifacts/contracts/VRFConsumer.sol/VRFConsumer.json";

const obj_contract_name_artifact = {
  ContractControl: ContractControl_artifact,
  DataFeedConsumer: DataFeedConsumer_artifact,
  RoleControl: RoleControl_artifact,
  Prepayment: Prepayment_artifact,
  SSLottery: SSLottery_artifact,
  Treasury: Treasury_artifact,
  VRFConsumer: VRFConsumer_artifact,
} satisfies Record<ContractName, any>;

export default obj_contract_name_artifact;
