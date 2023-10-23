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
  console.info(`${contractName} deployed at ${address}`);
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
    console.info("Overrides: ", overrides);
    response = await fn(...args, overrides);
  } else {
    response = await fn(...args);
  }
  console.info(`Transaction sent: ${response.hash}`);
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

async function EndTime(lengthLottery: bigint) {
  return BigInt(await time.latest()) + lengthLottery;
}

describe("Lottery on Testnet", () => {
  // --------- //
  // Constants //
  // --------- //
  const _priceTicket = ethers.parseEther("1");
  const _discountDivisor = "2000";

  const _winnersPortion = "1000";
  const _burnPortion = "8000";
  let endTime: BigInt;
  let endPromise: Promise<any>;

  let lotteryId = BigInt("0");

  // ----- //
  // Setup //
  // ----- //
  const contractPromises = Object.entries(contractsConfig).map(async ([name, { address, artifact }]) => {
    const { default: artifactJson } = await import(artifact, { assert: { type: "json" } });
    const abiInterface = new ethers.Interface(artifactJson.abi);
    contracts[name] = {
      abi: abiInterface,
    };
    if (address) {
      console.info(`${name} already deployed at ${address}`);
      contracts[name].contract = new ethers.Contract(address, abiInterface, provider);
    } else {
      contracts[name].bytecode = artifactJson.bytecode;
      throw Error();
    }
  });

  before(async () => {
    const [rngResult, klayLotteryResult] = await Promise.allSettled(contractPromises);
    if (rngResult.status === "rejected")
      await deployContract("RandomNumberGenerator", [
        config.VRFCoordinator.testnet,
        config.KeyHash.testnet,
        config.CallbackGasLimit.testnet,
      ]);
    if (klayLotteryResult.status === "rejected")
      await deployContract("KlayLottery", [contractsConfig.RandomNumberGenerator.address]);

    await sendFn(["alice", "RandomNumberGenerator", "setLotteryAddress", [contractsConfig.KlayLottery.address]]);
    await sendFn([
      "alice",
      "KlayLottery",
      "setOperatorAndInjectorAddresses",
      [wallets.operator.address, wallets.injector.address],
    ]);
    await sendFn(["alice", "KlayLottery", "reset"]);

    lotteryId = await contracts.KlayLottery.contract.currentLotteryId();
  });

  describe("startLottery", () => {
    before(async () => {
      const _lengthLottery = 999n;
      endTime = await EndTime(_lengthLottery);
    });

    it("rejects descending rewardPortions", async () => {
      try {
        await sendFn([
          "operator",
          "KlayLottery",
          "startLottery",
          [
            endTime.toString(),
            _priceTicket.toString(),
            _discountDivisor,
            _winnersPortion,
            _burnPortion,
            ["1", "3", "2"], // 2 < 3
          ],
        ]);
      } catch (e) {
        expect(e).instanceOf(Error);
      }
    });

    it("rejects if allWinnersRewardPortion < rewardPortions[1]", async () => {
      try {
        await sendFn([
          "operator",
          "KlayLottery",
          "startLottery",
          [
            endTime.toString(),
            _priceTicket.toString(),
            _discountDivisor,
            _winnersPortion,
            _burnPortion,
            ["1", "2", "3"], // 1 + 2 + 3 = 6; 10000 - 6 = 9994; 1 < 9994
          ],
        ]);
      } catch (e) {
        expect(e).instanceOf(Error);
      }
    });

    it("rejects too short rewardPortions", async () => {
      try {
        await sendFn([
          "operator",
          "KlayLottery",
          "startLottery",
          [endTime.toString(), _priceTicket.toString(), _discountDivisor, _winnersPortion, _burnPortion, ["1", "2"]],
        ]);
        throw Error("Was supposed to throw");
      } catch (e) {
        expect(e).instanceOf(Error);
      }
    });

    it("rejects too long rewardPortions", async () => {
      try {
        await sendFn([
          "operator",
          "KlayLottery",
          "startLottery",
          [
            endTime.toString(),
            _priceTicket.toString(),
            _discountDivisor,
            _winnersPortion,
            _burnPortion,
            ["1", "2", "3", "4", "5", "6", "7"],
          ],
        ]);
        throw Error("Was supposed to throw");
      } catch (e) {
        expect(e).instanceOf(Error);
      }
    });
  });

  // ---- //
  // Test //
  // ---- //
  describe("Basic flow", () => {
    const _lengthLottery = 20n;
    const _rewardPortions = ["200", "300", "500", "1500", "2500", "5000"];

    const finalNumber = "234561";
    const objAccountTicketIds = {
      bob: [finalNumber],
      carol: ["234560", "234562"],
    };

    it("Operator starts lottery", async () => {
      endTime = await EndTime(_lengthLottery);
      const startTx = await sendFn([
        "operator",
        "KlayLottery",
        "startLottery",
        [endTime.toString(), _priceTicket.toString(), _discountDivisor, _winnersPortion, _burnPortion, _rewardPortions],
      ]);
      endPromise = sleep(Number(_lengthLottery) * 1000);
      const startReceipt = startTx[1];
      const lotteryOpenEvent = findEvent(startReceipt, "LotteryOpen");
      const prevLotteryId = lotteryId;
      lotteryId = lotteryOpenEvent.args[0];
      expect(lotteryId).to.equal(prevLotteryId + 1n, "Lottery ID should increment by 1");
    });

    it("Bob buys 1 ticket", async () => {
      const buyTicketTx = await sendFn([
        "bob",
        "KlayLottery",
        "buyTickets",
        [lotteryId, objAccountTicketIds.bob],
        {
          value: _priceTicket,
        },
      ]);
      const buyTicketReceipt = buyTicketTx[1];
      const ticketsPurchaseEvent = findEvent(buyTicketReceipt, "TicketsPurchase");
      const nTickets = ticketsPurchaseEvent.args[2];
      expect(nTickets).to.equal(1n, "Bob should buy 1 ticket");
    });

    it("Carol buys 2 tickets", async () => {
      const value = await contracts.KlayLottery.contract.calculateCurrentTotalPriceForBulkTickets(
        objAccountTicketIds.carol.length.toString()
      );
      const buyTicketTx = await sendFn([
        "carol",
        "KlayLottery",
        "buyTickets",
        [lotteryId, objAccountTicketIds.carol],
        { value },
      ]);
      const buyTicketReceipt = buyTicketTx[1];
      const ticketsPurchaseEvent = findEvent(buyTicketReceipt, "TicketsPurchase");
      const nTickets = ticketsPurchaseEvent.args[2];
      expect(nTickets).to.equal(2n, "Carol should buy 2 tickets");
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
      await endPromise;
      await sendFn(["operator", "KlayLottery", "closeLottery", [lotteryId]]);
    });

    it("Operator draws lottery", async () => {
      const tx = await sendFn([
        "operator",
        "KlayLottery",
        "setFinalNumberAndMakeLotteryClaimable",
        [lotteryId, true, finalNumber],
      ]);
      const receipt = tx[1];
      const lotteryNumberDrawnEvent = findEvent(receipt, "LotteryNumberDrawn");
      const nWinners = lotteryNumberDrawnEvent.args[2];
      expect(nWinners).to.equal(1n, "Only Bob should win");
    });

    async function claimTickets(accountName: AccountName, size: number) {
      const tickets = await contracts.KlayLottery.contract.viewUserInfoForLotteryId(
        wallets[accountName].address,
        lotteryId,
        0,
        size
      );
      const ticketIds = tickets[0].toArray();
      console.info(`Ticket IDs: ${ticketIds}`);
      const claimTicketsTx = await sendFn([accountName, "KlayLottery", "claimTickets", [lotteryId, ticketIds]]);
      const claimTicketsReceipt = claimTicketsTx[1];
      const ticketsClaimEvent = findEvent(claimTicketsReceipt, "TicketsClaim");
      console.info(`Reward: ${ticketsClaimEvent.args[1]}`);
    }

    it("Bob claims his tickets", async () => {
      await claimTickets("bob", 1);
    });

    it("Carol claims her tickets", async () => {
      await claimTickets("carol", 2);
    });
  });
});
