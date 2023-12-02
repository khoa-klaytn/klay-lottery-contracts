const PATTERN_ADDRESS = "(0x[0-9a-fA-F]{40})";
const PATTERN_STARTBLOCK = "(\\d+)";

type TuplePathPattern = [string, string];
export type ObjPartDependentArr = {
  abi?: string[];
  address?: TuplePathPattern[];
  startBlock?: TuplePathPattern[];
};
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
        `\\s+\\[ChainId\\.KLAYTN_TESTNET\\]: '${PATTERN_ADDRESS}',`,
      ],
      ["server/env/development.env", `LOTTERY_ADDRESS=${PATTERN_ADDRESS}`],
      ["server/env/production.env", `LOTTERY_ADDRESS=${PATTERN_ADDRESS}`],
      ["server/env/test.env", `LOTTERY_ADDRESS=${PATTERN_ADDRESS}`],
      ["subgraph/subgraphs/lottery/subgraph.yaml", `\\s+address: '${PATTERN_ADDRESS}'`],
    ],
    startBlock: [["subgraph/subgraphs/lottery/subgraph.yaml", `\\s+startBlock: ${PATTERN_STARTBLOCK}`]],
  },
};

export default obj_contract_name_obj_part_dependent_arr;
