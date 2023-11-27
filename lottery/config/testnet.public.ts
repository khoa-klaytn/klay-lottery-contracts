const Addresses: Record<Extract<ContractName, "Prepayment" | "Treasury">, HexStr> = {
  Prepayment: "0x8d3A1663d10eEb0bC9C9e537e1BBeA69383194e7",
  Treasury: "0x3123Ca333026e4AbafBF47C5a3cE16401767d4CE",
};

const config = {
  Url: "https://public-en-baobab.klaytn.net/",
  ChainId: 1001,
  args: {
    "DataFeedConsumer._aggregatorProxyAddress": "0xC874f389A3F49C5331490145f77c4eFE202d72E1",
    "VRFConsumer._callbackGasLimit": 500000n,
    "VRFConsumer._keyHash": "0xd9af33106d664a53cb9946df5cd81a30695f5b72224ee64e798b278af812779c",
    "VRFConsumer._coordinatorAddress": "0xDA8c0A00A372503aa6EC80f9b29Cc97C454bE499",
  },
  Addresses,
};

export default config;
