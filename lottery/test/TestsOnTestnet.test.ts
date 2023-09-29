import { BN, time } from "@openzeppelin/test-helpers";
import { ethers } from "ethers";
import { Logger, parseEther } from "ethers/lib/utils";
import { contract } from "hardhat";
import accountsConfig from "./accounts.json";
import contractsConfig from "./contracts.json";

// ----- //
// Setup //
// ----- //
const provider = new ethers.providers.JsonRpcProvider("https://public-en-baobab.klaytn.net/");

type AccountName = keyof typeof accountsConfig;
const wallets: Record<AccountName, ethers.Wallet> = {} as any;
Object.entries(accountsConfig).forEach(([name, privateKey]) => {
  wallets[name] = new ethers.Wallet(privateKey, provider);
});

type ContractName = keyof typeof contractsConfig;
const abis: Record<ContractName, ethers.utils.Interface> = {} as any;
const contracts: Record<ContractName, ethers.Contract> = {} as any;

// ------------ //
// Tx Functions //
// ------------ //
/**
 * Create a signer & use it to call a contract function
 * @param args Refer to contract ABI
 * @returns Contract function response
 */
async function sendTransaction(
  accountName: AccountName,
  contractName: ContractName,
  functionName: string,
  args: any[]
) {
  const signer = contracts[contractName].connect(wallets[accountName]);
  const fn = signer.functions[functionName];
  const response = await fn(...args);
  console.log(`Transaction sent: ${response.hash}`);
  return response as ethers.providers.TransactionResponse;
}
/**
 * Wait for a transaction to be mined, handle transaction replacement
 * @param _response Response to wait for
 * @returns (replaced) response & receipt
 */
async function waitResponse(_response: ethers.providers.TransactionResponse) {
  let response = _response;
  let receipt: ethers.providers.TransactionReceipt;
  try {
    receipt = await _response.wait(1);
  } catch (e) {
    // Handle transaction replacement
    if (e.code === Logger.errors.TRANSACTION_REPLACED) {
      // Transaction replaced but not mined
      if (e.cancelled) {
        return waitResponse(e.replacement);
      }
      // Transaction replaced & mined
      response = e.replacement;
      receipt = e.receipt;
    }
    throw e;
  }
  return [response, receipt] as const;
}

function sleep(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

contract("Lottery on Testnet", () => {
  // --------- //
  // Constants //
  // --------- //
  const _priceTicket = parseEther("0.5");
  const _discountDivisor = "2000";

  const _rewardsBreakdown = ["200", "300", "500", "1500", "2500", "5000"];
  const _treasuryFee = "2000";
  let endTime: BN;

  const lotteryId = "1";

  // ----- //
  // Setup //
  // ----- //
  const contractPromises = Object.entries(contractsConfig).map(async ([name, { address, abi }]) => {
    const abiInterface = new ethers.utils.Interface((await import(abi)).default);
    abis[name] = abiInterface;
    contracts[name] = new ethers.Contract(address, abiInterface, provider);
  });

  async function setLotteryAddress() {
    const setLotteryAddressResponse = await sendTransaction("alice", "RandomNumberGenerator", "setLotteryAddress", [
      contracts.KlayLottery.address,
    ]);
    await setLotteryAddressResponse.wait(1);
  }
  async function setRoles() {
    const setRolesResponse = await sendTransaction(
      "alice",
      "KlayLottery",
      "setOperatorAndTreasuryAndInjectorAddresses",
      [wallets.operator.address, wallets.treasury.address, wallets.injector.address]
    );
    await setRolesResponse.wait(1);
  }

  before(async () => {
    await Promise.all(contractPromises);

    await setLotteryAddress();
    await setRoles();
  });

  // ---- //
  // Test //
  // ---- //
  describe("Basic flow", () => {
    const _lengthLottery = new BN("10");

    it("Operator starts lottery", async () => {
      endTime = new BN(await time.latest()).add(_lengthLottery);
      const startResponse = await sendTransaction("operator", "KlayLottery", "startLottery", [
        endTime.toString(),
        _priceTicket.toString(),
        _discountDivisor,
        _rewardsBreakdown,
        _treasuryFee,
      ]);
      const startReceipt = (await waitResponse(startResponse))[1];
      const lotteryOpenLog = startReceipt.logs.find((log) => {
        return log.topics.includes(abis.KlayLottery.getEventTopic("LotteryOpen"));
      });
      if (!lotteryOpenLog) {
        throw new Error("LotteryOpen event not found");
      }
      const parsedLog = abis.KlayLottery.parseLog(lotteryOpenLog);
      console.log(parsedLog);
      // Sleep for _lengthLottery
      await sleep(_lengthLottery.toNumber() * 1000);
    });
  });
});
