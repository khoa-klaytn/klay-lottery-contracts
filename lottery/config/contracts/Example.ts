const abi = [] as const satisfies ContractAbi;

export type Abi = typeof abi;

const config: ContractConfigSync<Abi> = {
  artifact: "path/to/Example.sol/Example.json",
  abi,
};

export default config;
