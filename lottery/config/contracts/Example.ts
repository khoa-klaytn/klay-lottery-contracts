const abi = [] as const satisfies ContractAbi;

export type Abi = typeof abi;

const config: ContractConfig<Abi> = {
  address: "0x", // Keep this on top since the others can get long
  args: {},
  artifact: "path/to/Example.sol/Example.json",
  abi,
  bytecode: "",
};

export default config;
