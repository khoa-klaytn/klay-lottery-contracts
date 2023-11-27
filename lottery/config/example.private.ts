const wallets: Record<WalletName, HexStr> = {
  owner: "0x",
  operator: "0x",
  injector: "0x",
  querier: "0x",
  server: "0x",
  bob: "0x",
  carol: "0x",
};

/**
 * If filled in, the contract address will be used
 * else, a new contract will be deployed
 */
const Contracts: Partial<Record<Exclude<ContractName, "Prepayment" | "Treasury">, HexStr>> = {
  SSLottery: "0x",
  RoleControl: "0x",
  ContractControl: "0x",
  VRFConsumer: "0x",
  DataFeedConsumer: "0x",
};

const config = {
  wallets,
  args: {
    "Prepayment.accId": 0n,
  },
  Contracts,
};

export default config;
