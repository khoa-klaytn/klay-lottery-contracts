declare global {
  type WalletName = "owner" | "bob" | "carol" | "operator" | "injector" | "server";
  type WalletConfig = {
    privateKey: HexStr;
  };
}

export {};
