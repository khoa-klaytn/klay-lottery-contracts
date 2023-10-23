import { ethers, network } from "hardhat";
import config from "../config";

const currentNetwork = network.name;

const main = async () => {
  let RandomNumberGenerator;
  let DataFeedConsumer;
  let KlayLottery;
  if (currentNetwork === "testnet") {
    RandomNumberGenerator = await ethers.getContractFactory("TestRandomNumberGenerator");
    DataFeedConsumer = await ethers.getContractFactory("TestDataFeedConsumer");
    KlayLottery = await ethers.getContractFactory("TestKlayLottery");
  } else {
    RandomNumberGenerator = await ethers.getContractFactory("RandomNumberGenerator");
    DataFeedConsumer = await ethers.getContractFactory("DataFeedConsumer");
    KlayLottery = await ethers.getContractFactory("KlayLottery");
  }

  const randomNumberGenerator = await RandomNumberGenerator.deploy(
    config.VRFCoordinator[currentNetwork],
    config.KeyHash[currentNetwork],
    config.CallbackGasLimit[currentNetwork]
  );
  const randomNumberGeneratorReceipt = await randomNumberGenerator.deploymentTransaction().wait();
  const randomNumberGeneratorAddress = randomNumberGeneratorReceipt.contractAddress;
  console.info("RandomNumberGenerator deployed to:", randomNumberGeneratorAddress);

  const dataFeedConsumer = await DataFeedConsumer.deploy(config.DataFeed[currentNetwork]);
  const dataFeedConsumerReceipt = await dataFeedConsumer.deploymentTransaction().wait();
  const dataFeedConsumerAddress = dataFeedConsumerReceipt.contractAddress;
  console.info("DataFeedConsumer deployed to:", dataFeedConsumerAddress);

  const klayLottery = await KlayLottery.deploy(randomNumberGeneratorAddress, dataFeedConsumerAddress);
  const klayLotteryReceipt = await klayLottery.deploymentTransaction().wait();
  const klayLotteryAddress = klayLotteryReceipt.contractAddress;
  console.info("KlayLottery deployed to:", klayLotteryAddress);

  // Set lottery address
  await randomNumberGenerator.setLotteryAddress(klayLotteryAddress);
  await dataFeedConsumer.setLotteryAddress(klayLotteryAddress);
  // Set roles
  await klayLottery.setOperatorAndInjectorAddresses(
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
