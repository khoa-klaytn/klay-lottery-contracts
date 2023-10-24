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
  console.info(`${contractName}.${functionName}@${accountName}: ${response.hash}`);
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

function catchCustomErr(contractName: ContractName) {
  function catchCustomErr(err) {
    if (err instanceof Error) {
      if ("data" in err && ethers.isBytesLike(err.data)) {
        const customErr = contracts[contractName].abi.parseError(err.data);
        console.error(customErr);
      }
    }
    throw err;
  }
  return catchCustomErr;
}

describe("Lottery on Testnet", () => {
  // --------- //
  // Constants //
  // --------- //
  const _discountDivisor = "2000";

  const _winnersPortion = "1000";
  const _burnPortion = "8000";
  let ticketPriceInUsd: bigint;
  let endTime: BigInt;
  let endPromise: Promise<any>;

  let lotteryId = 0n;

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

  before(async function () {
    this.timeout(999999);

    const [rngResult, dfcResult, klayLotteryResult] = await Promise.allSettled(contractPromises);
    if (rngResult.status === "rejected")
      await deployContract("RandomNumberGenerator", [
        config.VRFCoordinator.testnet,
        config.KeyHash.testnet,
        config.CallbackGasLimit.testnet,
      ]);
    if (dfcResult.status === "rejected") await deployContract("DataFeedConsumer", [config.DataFeed.testnet]);

    await sendFn(["alice", "DataFeedConsumer", "setQuerier", [wallets.querier.address]]);

    const dataFeedQuerier = contracts.DataFeedConsumer.contract.connect(wallets.querier);
    let klay2usd: bigint;
    let baseUsd: number;
    await Promise.all([
      (async () => {
        klay2usd = BigInt(await dataFeedQuerier["queryLatestData"]());
      })(),
      (async () => {
        baseUsd = Number(await dataFeedQuerier["queryBaseUsd"]());
      })(),
    ]);
    console.log(`klay2usd: ${klay2usd}`);
    console.log(`baseUsd: ${baseUsd}`);
    const minTicketPriceInUsd = BigInt(Math.round(0.005 * baseUsd));
    ticketPriceInUsd = BigInt(Math.round(0.1 * baseUsd));

    if (klayLotteryResult.status === "rejected")
      await deployContract("KlayLottery", [
        contractsConfig.RandomNumberGenerator.address,
        contractsConfig.DataFeedConsumer.address,
        minTicketPriceInUsd,
      ]);
    await sendFn(["alice", "DataFeedConsumer", "setKlayLottery", [contractsConfig.KlayLottery.address]]);
    await sendFn([
      "alice",
      "RandomNumberGenerator",
      "setRoles",
      [contractsConfig.KlayLottery.address, wallets.querier.address],
    ]);

    await sendFn([
      "alice",
      "KlayLottery",
      "setOperatorAndInjectorAddresses",
      [wallets.operator.address, wallets.injector.address],
    ]);
    await sendFn(["alice", "KlayLottery", "reset"]);
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
            endTime,
            ticketPriceInUsd,
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
            endTime,
            ticketPriceInUsd,
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
          [endTime, ticketPriceInUsd, _discountDivisor, _winnersPortion, _burnPortion, ["1", "2"]],
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
            endTime,
            ticketPriceInUsd,
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
    const _rewardPortions = ["1000", "1125", "1250", "1375", "1625", "2625"]; // allWinners get 1000

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
        [endTime, ticketPriceInUsd, _discountDivisor, _winnersPortion, _burnPortion, _rewardPortions],
      ]);
      endPromise = sleep(Number(_lengthLottery) * 1000);
      const startReceipt = startTx[1];
      const lotteryOpenEvent = findEvent(startReceipt, "LotteryOpen");
      const prevLotteryId = lotteryId;
      lotteryId = lotteryOpenEvent.args[0];
      expect(lotteryId).to.equal(prevLotteryId + 1n, "Lottery ID should increment by 1");
    });

    it("Bob buys 1 ticket", async () => {
      const value = await contracts.KlayLottery.contract.calculateCurrentTotalPriceForBulkTickets(
        objAccountTicketIds.bob.length
      );
      const buyTicketTx = await sendFn([
        "bob",
        "KlayLottery",
        "buyTickets",
        [lotteryId, objAccountTicketIds.bob],
        { value },
      ]).catch(catchCustomErr("KlayLottery"));
      const buyTicketReceipt = buyTicketTx[1];
      const ticketsPurchaseEvent = findEvent(buyTicketReceipt, "TicketsPurchase");
      const nTickets = ticketsPurchaseEvent.args[2];
      expect(nTickets).to.equal(1n, "Bob should buy 1 ticket");
    });

    it("Carol buys 2 tickets", async () => {
      const value = await contracts.KlayLottery.contract.calculateCurrentTotalPriceForBulkTickets(
        objAccountTicketIds.carol.length
      );
      const buyTicketTx = await sendFn([
        "carol",
        "KlayLottery",
        "buyTickets",
        [lotteryId, objAccountTicketIds.carol],
        { value },
      ]).catch(catchCustomErr("KlayLottery"));
      const buyTicketReceipt = buyTicketTx[1];
      const ticketsPurchaseEvent = findEvent(buyTicketReceipt, "TicketsPurchase");
      const nTickets = ticketsPurchaseEvent.args[2];
      expect(nTickets).to.equal(2n, "Carol should buy 2 tickets");
    });

    it("Injector injects funds", async () => {
      const value = await contracts.KlayLottery.contract.calculateCurrentTotalPriceForBulkTickets(1);
      await sendFn(["injector", "KlayLottery", "injectFunds", [lotteryId], { value }]);
    });

    it("Operator closes lottery", async () => {
      // Wait for lottery to end
      await endPromise;
      await sendFn(["operator", "KlayLottery", "closeLottery", [lotteryId]]).catch(catchCustomErr("KlayLottery"));
    });

    it("Operator draws lottery", async () => {
      const tx = await sendFn([
        "operator",
        "KlayLottery",
        "setFinalNumberAndMakeLotteryClaimable",
        [lotteryId, true, finalNumber],
      ]).catch(catchCustomErr("KlayLottery"));
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
      const claimTicketsTx = await sendFn([accountName, "KlayLottery", "claimTickets", [lotteryId, ticketIds]]).catch(
        catchCustomErr("KlayLottery")
      );
      const claimTicketsReceipt = claimTicketsTx[1];
      const ticketsClaimEvent = findEvent(claimTicketsReceipt, "TicketsClaim");
      console.info(`Reward: ${ticketsClaimEvent.args[1]}`);
    }

    it("Bob claims his tickets", async () => {
      await claimTickets("bob", 1).catch(catchCustomErr("KlayLottery"));
    });

    it("Carol claims her tickets", async () => {
      await claimTickets("carol", 2).catch(catchCustomErr("KlayLottery"));
    });
  });
});
