declare global {
  type WalletName = "owner" | "bob" | "carol" | "operator" | "injector" | "querier";
  type WalletConfig = {
    privateKey: HexStr;
  };
}

export {};
