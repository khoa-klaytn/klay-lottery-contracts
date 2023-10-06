import { ethers, network } from "hardhat";
import config from "../config";

const currentNetwork = network.name;

const main = async (withVRFOnTestnet = true) => {
  const KlayLottery = await ethers.getContractFactory("KlayLottery");

  if (currentNetwork === "testnet") {
    let randomNumberGenerator;
    let randomNumberGeneratorAddress;

    if (withVRFOnTestnet) {
      const RandomNumberGenerator = await ethers.getContractFactory("RandomNumberGenerator");

      randomNumberGenerator = await RandomNumberGenerator.deploy(
        config.VRFCoordinator[currentNetwork],
        config.KeyHash[currentNetwork],
        config.CallbackGasLimit[currentNetwork]
      );
      const randomNumberGeneratorReceipt = await randomNumberGenerator.deploymentTransaction().wait();
      randomNumberGeneratorAddress = randomNumberGeneratorReceipt.contractAddress;
      console.log("RandomNumberGenerator deployed to:", randomNumberGeneratorAddress);
    }
    // else {
    //   console.log("RandomNumberGenerator without VRF is deployed..");

    //   const RandomNumberGenerator = await ethers.getContractFactory("MockRandomNumberGenerator");
    //   randomNumberGenerator = await RandomNumberGenerator.deploy();
    //   await randomNumberGenerator.waitForDeployment();

    //   console.log("RandomNumberGenerator deployed to:", randomNumberGeneratorAddress);
    // }

    const klayLottery = await KlayLottery.deploy(randomNumberGeneratorAddress);
    const klayLotteryReceipt = await klayLottery.deploymentTransaction().wait();
    const klayLotteryAddress = klayLotteryReceipt.contractAddress;
    console.log("KlayLottery deployed to:", klayLotteryAddress);

    // Set lottery address
    await randomNumberGenerator.setLotteryAddress(klayLotteryAddress);

    // Set operator & treasury adresses
    await klayLottery.setOperatorAndInjectorAddresses(
      config.OperatorAddress[currentNetwork],
      config.InjectorAddress[currentNetwork]
    );
  }
  // else if (currentNetwork === "mainnet") {
  //   const RandomNumberGenerator = await ethers.getContractFactory("RandomNumberGenerator");
  //   const randomNumberGenerator = await RandomNumberGenerator.deploy(
  //     config.VRFCoordinator[currentNetwork],
  //   );

  //   await randomNumberGenerator.waitForDeployment();
  //   console.log("RandomNumberGenerator deployed to:", randomNumberGeneratorAddress);

  //   // Set fee
  //   await randomNumberGenerator.setFee(config.FeeInLink[currentNetwork]);

  //   // Set key hash
  //   await randomNumberGenerator.setKeyHash(config.KeyHash[currentNetwork]);

  //   const klayLottery = await KlayLottery.deploy(config.KlayToken[currentNetwork], randomNumberGeneratorAddress);

  //   await klayLottery.waitForDeployment();
  //   console.log("KlayLottery deployed to:", klayLotteryAddress);

  //   // Set lottery address
  //   await randomNumberGenerator.setLotteryAddress(klayLotteryAddress);

  //   // Set operator & treasury adresses
  //   await klayLottery.setOperatorAndInjectorAddresses(
  //     config.OperatorAddress[currentNetwork],
  //     config.InjectorAddress[currentNetwork]
  //   );
  // }
};

main(true)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
