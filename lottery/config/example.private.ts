const Wallets: Record<WalletName, HexStr> = {
  owner: "0x",
  operator: "0x",
  injector: "0x",
  querier: "0x",
  server: "0x",
  bob: "0x",
  carol: "0x",
};

const addresses: PrivateAddresses = {
  ContractControl: "0x",
  DataFeedConsumer: "0x",
  RoleControl: "0x",
  SSLottery: "0x",
  VRFConsumer: "0x",
  replace: true,
};

const config = {
  Wallets,
  args: {
    "Prepayment.accId": 0n,
  },
  addresses,
};

export default config;
