import { ethers, network } from "hardhat";
import config from "../config";

const currentNetwork = network.name;

const main = async (withVRFOnTestnet = true) => {
  const KlayLottery = await ethers.getContractFactory("KlayLottery");

  if (currentNetwork === "testnet") {
    let randomNumberGenerator;

    if (withVRFOnTestnet) {
      console.log("RandomNumberGenerator with VRF is deployed..");
      const RandomNumberGenerator = await ethers.getContractFactory("RandomNumberGenerator");

      randomNumberGenerator = await RandomNumberGenerator.deploy(
        config.VRFCoordinator[currentNetwork],
        config.KeyHash[currentNetwork],
        config.CallbackGasLimit[currentNetwork]
      );
      await randomNumberGenerator.deployed();
      console.log("RandomNumberGenerator deployed to:", randomNumberGenerator.address);
    }
    // else {
    //   console.log("RandomNumberGenerator without VRF is deployed..");

    //   const RandomNumberGenerator = await ethers.getContractFactory("MockRandomNumberGenerator");
    //   randomNumberGenerator = await RandomNumberGenerator.deploy();
    //   await randomNumberGenerator.deployed();

    //   console.log("RandomNumberGenerator deployed to:", randomNumberGenerator.address);
    // }

    const klayLottery = await KlayLottery.deploy(randomNumberGenerator.address);

    await klayLottery.deployed();
    console.log("KlayLottery deployed to:", klayLottery.address);

    // Set lottery address
    await randomNumberGenerator.setLotteryAddress(klayLottery.address);

    // Set operator & treasury adresses
    await klayLottery.setOperatorAndTreasuryAndInjectorAddresses(
      config.OperatorAddress[currentNetwork],
      config.TreasuryAddress[currentNetwork],
      config.InjectorAddress[currentNetwork]
    );
  }
  // else if (currentNetwork === "mainnet") {
  //   const RandomNumberGenerator = await ethers.getContractFactory("RandomNumberGenerator");
  //   const randomNumberGenerator = await RandomNumberGenerator.deploy(
  //     config.VRFCoordinator[currentNetwork],
  //   );

  //   await randomNumberGenerator.deployed();
  //   console.log("RandomNumberGenerator deployed to:", randomNumberGenerator.address);

  //   // Set fee
  //   await randomNumberGenerator.setFee(config.FeeInLink[currentNetwork]);

  //   // Set key hash
  //   await randomNumberGenerator.setKeyHash(config.KeyHash[currentNetwork]);

  //   const klayLottery = await KlayLottery.deploy(config.KlayToken[currentNetwork], randomNumberGenerator.address);

  //   await klayLottery.deployed();
  //   console.log("KlayLottery deployed to:", klayLottery.address);

  //   // Set lottery address
  //   await randomNumberGenerator.setLotteryAddress(klayLottery.address);

  //   // Set operator & treasury adresses
  //   await klayLottery.setOperatorAndTreasuryAndInjectorAddresses(
  //     config.OperatorAddress[currentNetwork],
  //     config.TreasuryAddress[currentNetwork],
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
