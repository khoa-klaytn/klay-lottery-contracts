import type { ethers } from "ethers";

declare global {
  type ContractName = "RandomNumberGenerator" | "DataFeedConsumer" | "KlayLottery";
  type ContractAbi = ReadonlyArray<ethers.JsonFragment>;
  /**
   * A type to store inputs for non-immediate use
   */
  type InputsRecord<T extends ethers.JsonFragment> = {
    [K in T["name"]]?: T extends { name: K; type: infer KT }
      ? KT extends AbiFnInputKey
        ? ObjAbiFnInputKeyType[KT]
        : never
      : never;
  };
  type ContractConfig<T extends ContractAbi> = {
    args?: InputsRecord<T[0]["inputs"][number]>;
    artifact: string;
    abi: T;
  } & ( // Either address or bytecode must be defined
    | {
        address: HexStr;
        bytecode?: string;
      }
    | {
        address?: "";
        bytecode: string;
      }
  );
}

export {};
