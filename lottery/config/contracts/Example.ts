const abi = [] as const satisfies ContractAbi;

export type Abi = typeof abi;

const config: Omit<ContractConfig<Abi>, "bytecode"> = {
  address: "0x", // Keep this on top since the others can get long
  artifact: "path/to/Example.sol/Example.json",
  abi,
};

export default config;
