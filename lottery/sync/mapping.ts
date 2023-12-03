import { WrappedPattern } from "../helpers";

const PATTERN_ADDRESS = "0x[0-9a-fA-F]{40}";
const PATTERN_STARTBLOCK = "\\d+";

export type TuplePathPattern = [string, string];
export type TuplePathPatternKey = "address" | "startBlock";
export type ObjPartDependentArr = {
  abi?: string[];
} & Partial<Record<TuplePathPatternKey, TuplePathPattern[]>>;
type ObjContractNameObjPartDependentArr = {
  [contract_name in ContractName]?: ObjPartDependentArr;
};

const obj_contract_name_obj_part_dependent_arr: ObjContractNameObjPartDependentArr = {
  DataFeedConsumer: {
    abi: ["frontend/apps/web/src/config/abi/DataFeedConsumer.ts"],
  },
  SSLottery: {
    abi: [
      "frontend/apps/web/src/config/abi/SSLottery.ts",
      "server/src/constants/contracts/Lottery/abi.ts",
      "subgraph/subgraphs/lottery/abis/SSLottery.json",
    ],
    address: [
      [
        "frontend/apps/web/src/config/constants/contracts.ts",
        WrappedPattern({ pattern: PATTERN_ADDRESS, before: "\\s+\\[ChainId\\.KLAYTN_TESTNET\\]: '" }),
      ],
      ["server/env/development.env", WrappedPattern({ pattern: PATTERN_ADDRESS, before: "LOTTERY_ADDRESS=" })],
      ["server/env/production.env", WrappedPattern({ pattern: PATTERN_ADDRESS, before: "LOTTERY_ADDRESS=" })],
      ["server/env/test.env", WrappedPattern({ pattern: PATTERN_ADDRESS, before: "LOTTERY_ADDRESS=" })],
      [
        "subgraph/subgraphs/lottery/subgraph.yaml",
        WrappedPattern({ pattern: PATTERN_ADDRESS, before: "\\s+address: '" }),
      ],
    ],
    startBlock: [
      [
        "subgraph/subgraphs/lottery/subgraph.yaml",
        WrappedPattern({ pattern: PATTERN_STARTBLOCK, before: "\\s+startBlock: " }),
      ],
    ],
  },
};

export default obj_contract_name_obj_part_dependent_arr;
