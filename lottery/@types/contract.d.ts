import type { ethers } from "ethers";

declare global {
  type ContractName =
    | "RoleControl"
    | "ContractControl"
    | "Treasury"
    | "VRFConsumer"
    | "DataFeedConsumer"
    | "SSLottery"
    | "Prepayment";
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
  type ContractConfigSync<T extends ContractAbi> = {
    artifact: string;
    abi: T;
  };
  type ContractConfig<T extends ContractAbi> = ContractConfigSync<T> & // Either address or bytecode must be defined
    (
      | {
          address: HexStr;
          bytecode?: string;
        }
      | {
          address?: "";
          bytecode: string;
        }
    );

  type PublicContractName = "Prepayment" | "Treasury";
  type PrivateContractName = Exclude<ContractName, PublicContractName>;
  type ToReplace = {
    /**
     * If true, address will be replaced with the deployed address.
     * If false, address will be used as-is.
     * @default true
     */
    replace?: boolean;
  };
  type PrivateAddresses = {
    [K in PrivateContractName]: HexStr | ({ address: HexStr } & ToReplace);
  } & ToReplace;
}

export {};
