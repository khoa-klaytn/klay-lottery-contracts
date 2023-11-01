import { ethers, network } from "hardhat";
import config from "../config";

const currentNetwork = network.name;

const main = async () => {
  let VRFConsumer;
  let DataFeedConsumer;
  let SSLottery;
  if (currentNetwork === "testnet") {
    VRFConsumer = await ethers.getContractFactory("TestVRFConsumer");
    DataFeedConsumer = await ethers.getContractFactory("TestDataFeedConsumer");
    SSLottery = await ethers.getContractFactory("TestSSLottery");
  } else {
    VRFConsumer = await ethers.getContractFactory("VRFConsumer");
    DataFeedConsumer = await ethers.getContractFactory("DataFeedConsumer");
    SSLottery = await ethers.getContractFactory("SSLottery");
  }

  const VRFConsumer = await VRFConsumer.deploy(
    config.VRFCoordinator[currentNetwork],
    config.KeyHash[currentNetwork],
    config.CallbackGasLimit[currentNetwork]
  );
  const VRFConsumerReceipt = await VRFConsumer.deploymentTransaction().wait();
  const VRFConsumerAddress = VRFConsumerReceipt.contractAddress;
  console.info("VRFConsumer deployed to:", VRFConsumerAddress);

  const dataFeedConsumer = await DataFeedConsumer.deploy(config.DataFeed[currentNetwork]);
  const dataFeedConsumerReceipt = await dataFeedConsumer.deploymentTransaction().wait();
  const dataFeedConsumerAddress = dataFeedConsumerReceipt.contractAddress;
  console.info("DataFeedConsumer deployed to:", dataFeedConsumerAddress);

  const SSLottery = await SSLottery.deploy(VRFConsumerAddress, dataFeedConsumerAddress);
  const SSLotteryReceipt = await SSLottery.deploymentTransaction().wait();
  const SSLotteryAddress = SSLotteryReceipt.contractAddress;
  console.info("SSLottery deployed to:", SSLotteryAddress);

  // Set lottery address
  await VRFConsumer.setLotteryAddress(SSLotteryAddress);
  await dataFeedConsumer.setLotteryAddress(SSLotteryAddress);
  // Set roles
  await SSLottery.setOperatorAndInjectorAddresses(
    config.OperatorAddress[currentNetwork],
    config.InjectorAddress[currentNetwork]
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
