const config = {
  Url: "https://public-en-cypress.klaytn.net/",
  ChainId: 8217,
  args: {
    "DataFeedConsumer._aggregatorProxyAddress": "0x33d6ee12d4ade244100f09b280e159659fe0ace0",
    "VRFConsumer._callbackGasLimit": 500000n,
    "VRFConsumer._keyHash": "0x6cff5233743b3c0321a19ae11ab38ae0ddc7ddfe1e91b162fa8bb657488fb157",
    "VRFConsumer._coordinatorAddress": "0x3F247f70DC083A2907B8E76635986fd09AA80EFb",
  },
};

export default config;
