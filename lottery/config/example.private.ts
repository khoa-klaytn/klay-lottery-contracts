const wallets: Record<WalletName, HexStr> = {
  owner: "0x",
  operator: "0x",
  injector: "0x",
  querier: "0x",
  server: "0x",
  bob: "0x",
  carol: "0x",
};

const config = {
  wallets,
  args: {
    "Prepayment.accId": 0n,
  },
};

export default config;
