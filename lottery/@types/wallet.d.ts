declare global {
  type WalletName = "owner" | "bob" | "carol" | "operator" | "injector" | "querier" | "server";
  type WalletConfig = {
    privateKey: HexStr;
  };
}

export {};
