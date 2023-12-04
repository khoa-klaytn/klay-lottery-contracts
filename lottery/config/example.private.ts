const Wallets: Record<WalletName, HexStr> = {
  owner: "0x",
  operator: "0x",
  injector: "0x",
  server: "0x",
  bob: "0x",
  carol: "0x",
};

// prettier-ignore
const obj_contract_name_part_obj: ObjContractNamePartObj = {ContractControl:{address:"0x",startBlock:0,redeploy:true,},DataFeedConsumer:{address:"0x",startBlock:0,redeploy:true,},RoleControl:{address:"0x",startBlock:0,redeploy:true,},SSLottery:{address:"0x",startBlock:0,redeploy:true,},VRFConsumer:{address:"0x",startBlock:0,redeploy:true,},};

const config = {
  Wallets,
  args: {
    "Prepayment.accId": 0n,
  },
  obj_contract_name_part_obj,
};

export default config;
