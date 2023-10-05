import "@nomicfoundation/hardhat-ethers";
import { ethers } from "ethers";
import { time } from "@openzeppelin/test-helpers";
import { expect } from "chai";
import accountsConfig from "./accounts.json";
import contractsConfig from "./contracts.json";
import config from "../config";

// ----- //
// Setup //
// ----- //
const providerUrl = "https://public-en-baobab.klaytn.net/";
require("@openzeppelin/test-helpers/configure")({
  provider: providerUrl,
});

const provider = new ethers.JsonRpcProvider(providerUrl);

type AccountName = keyof typeof accountsConfig;
const wallets: Record<AccountName, ethers.Wallet> = {} as any;
Object.entries(accountsConfig).forEach(([name, privateKey]) => {
  wallets[name] = new ethers.Wallet(privateKey, provider);
});

type ContractName = keyof typeof contractsConfig;
type ContractType = {
  contract: ethers.Contract;
  abi: ethers.Interface;
  bytecode?: string;
};
const contracts: Record<ContractName, ContractType> = {} as any;

// ------------ //
// Tx Functions //
// ------------ //
async function deployContract(contractName: ContractName, args: any[] = []) {
  const { abi, bytecode } = contracts[contractName];
  const Contract = new ethers.ContractFactory(abi, bytecode!, wallets.alice);
  const contract = await Contract.deploy(...args);
  const receipt = await contract.deploymentTransaction()?.wait();
  if (!receipt) {
    throw new Error(`${contractName} receipt not found`);
  }
  const address = receipt.contractAddress;
  if (!address) {
    throw new Error(`${contractName} address not found`);
  }
  contractsConfig[contractName].address = address;
  contracts[contractName].contract = new ethers.Contract(address, abi, provider);
  console.log(`${contractName} deployed at ${address}`);
  return address;
}

/**
 * Wait for a transaction to be mined, handle transaction replacement
 * @param _response Response to wait for
 * @returns (replaced) response & receipt
 */
async function waitResponse(_response: ethers.TransactionResponse) {
  let response = _response;
  let receipt: ethers.TransactionReceipt;
  try {
    const _receipt = await response.wait(1);
    if (!_receipt) {
      throw new Error("Receipt not found");
    }
    receipt = _receipt;
  } catch (e) {
    // Handle transaction replacement
    if (ethers.isError(e, "TRANSACTION_REPLACED")) {
      // Transaction replaced but not mined
      if (e.cancelled) {
        return waitResponse(e.replacement);
      }
      // Transaction replaced & mined
      response = e.replacement;
      receipt = e.receipt;
    } else throw e;
  }
  return [response, receipt] as const;
}

/**
 * Create a signer & use it to call a contract function
 * @returns Contract function response
 */
async function _sendFn(
  accountName: AccountName,
  contractName: ContractName,
  functionName: string,
  args?: any[],
  overrides?: ethers.Overrides
) {
  if (!args) args = [];

  const signer = contracts[contractName].contract.connect(wallets[accountName]);
  const fn = signer[functionName];
  let response: ethers.TransactionResponse;
  if (overrides) {
    console.log("Overrides: ", overrides);
    response = await fn(...args, overrides);
  } else {
    response = await fn(...args);
  }
  console.log(`Transaction sent: ${response.hash}`);
  return response;
}

type _SendFnP = Parameters<typeof _sendFn>;
type _SendFnR = ReturnType<typeof _sendFn>;
type WaitResponseR = ReturnType<typeof waitResponse>;

function sendFn(a: _SendFnP, wait?: true): WaitResponseR;
function sendFn(a: _SendFnP, wait: false): _SendFnR;
async function sendFn(a: _SendFnP, wait = true) {
  const response = await _sendFn(...a);
  if (wait) {
    return waitResponse(response);
  }
  return response;
}

function findEvent(receipt: ethers.TransactionReceipt, _eventName: string) {
  let event: ethers.LogDescription;
  const eventName = contracts.KlayLottery.abi.getEventName(_eventName);
  for (const log of receipt.logs) {
    const parsedLog = contracts.KlayLottery.abi.parseLog({
      topics: Array.from(log.topics),
      data: log.data,
    });
    if (!parsedLog) continue;
    if (parsedLog.name === eventName) {
      event = parsedLog;
      break;
    }
  }
  if (!event!) {
    throw new Error(`${eventName} event not found`);
  }
  return event;
}

function sleep(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

describe("Lottery on Testnet", () => {
  // --------- //
  // Constants //
  // --------- //
  const _priceTicket = ethers.parseEther("1");
  const _discountDivisor = "2000";

  const _rewardsBreakdown = ["200", "300", "500", "1500", "2500", "5000"];
  const _winnersPortion = "1000";
  const _burnPortion = "8000";
  let endTime: BigInt;

  let lotteryId = BigInt("0");

  // ----- //
  // Setup //
  // ----- //
  const contractPromises = Object.entries(contractsConfig).map(async ([name, { address, artifact }]) => {
    const artifactJson = (await import(artifact)).default;
    const abiInterface = new ethers.Interface(artifactJson.abi);
    contracts[name] = {
      abi: abiInterface,
    };
    if (address) {
      console.log(`${name} already deployed at ${address}`);
      contracts[name].contract = new ethers.Contract(address, abiInterface, provider);
    } else {
      contracts[name].bytecode = artifactJson.bytecode;
    }
  });

  before(async () => {
    if (!contractsConfig.RandomNumberGenerator.address)
      contractsConfig.RandomNumberGenerator.address = await deployContract("RandomNumberGenerator", [
        config.VRFCoordinator.testnet,
        config.KeyHash.testnet,
        config.CallbackGasLimit.testnet,
      ]);
    if (!contractsConfig.KlayLottery.address)
      contractsConfig.KlayLottery.address = await deployContract("KlayLottery", [
        contractsConfig.RandomNumberGenerator.address,
      ]);

    await Promise.all(contractPromises);

    await sendFn(["alice", "RandomNumberGenerator", "setLotteryAddress", [contractsConfig.KlayLottery.address]]);
    await sendFn([
      "alice",
      "KlayLottery",
      "setOperatorAndInjectorAddresses",
      [wallets.operator.address, wallets.injector.address],
    ]);
    await sendFn(["alice", "KlayLottery", "reset"]);
  });

  // ---- //
  // Test //
  // ---- //
  describe("Basic flow", () => {
    const _lengthLottery = BigInt("20");
    const finalNumber = "234561";
    const objAccountTicketIds = {
      bob: [finalNumber],
      carol: ["234560", "234562"],
    };

    it("Operator starts lottery", async () => {
      endTime = BigInt(await time.latest()) + _lengthLottery;
      const startTx = await sendFn([
        "operator",
        "KlayLottery",
        "startLottery",
        [
          endTime.toString(),
          _priceTicket.toString(),
          _discountDivisor,
          _rewardsBreakdown,
          _winnersPortion,
          _burnPortion,
        ],
      ]);
      const startReceipt = startTx[1];
      const lotteryOpenEvent = findEvent(startReceipt, "LotteryOpen");
      const prevLotteryId = lotteryId;
      lotteryId = lotteryOpenEvent.args[0];
      expect(lotteryId).to.equal(prevLotteryId + BigInt("1"), "Lottery ID should increment by 1");
    });

    it("Bob buys 1 ticket", async () => {
      await sendFn([
        "bob",
        "KlayLottery",
        "buyTickets",
        [lotteryId, objAccountTicketIds.bob],
        {
          value: _priceTicket,
        },
      ]);
    });

    it("Carol buys 2 tickets", async () => {
      const value = await contracts.KlayLottery.contract.calculateCurrentTotalPriceForBulkTickets(
        objAccountTicketIds.carol.length.toString()
      );
      await sendFn(["carol", "KlayLottery", "buyTickets", [lotteryId, objAccountTicketIds.carol], { value }]);
    });

    it("Injector injects funds", async () => {
      await sendFn([
        "injector",
        "KlayLottery",
        "injectFunds",
        [lotteryId],
        {
          value: _priceTicket,
        },
      ]);
    });

    it("Operator closes lottery", async () => {
      // Wait for lottery to end
      await sleep(Number(_lengthLottery) * 500);
      await sendFn(["operator", "KlayLottery", "closeLottery", [lotteryId]]);
    });

    it("Operator draws lottery", async () => {
      await sendFn([
        "operator",
        "KlayLottery",
        "setFinalNumberAndMakeLotteryClaimable",
        [lotteryId, true, finalNumber],
      ]);
    });

    it("Bob claims his tickets", async () => {
      const tickets = await contracts.KlayLottery.contract.viewUserInfoForLotteryId(
        wallets.bob.address,
        lotteryId,
        0,
        1
      );
      const ticketIds = tickets[0].toArray();
      console.log(ticketIds);
      await sendFn(["bob", "KlayLottery", "claimTickets", [lotteryId, ticketIds]]);
    });
  });
});
