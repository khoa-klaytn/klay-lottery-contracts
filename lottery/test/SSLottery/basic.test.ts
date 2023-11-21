import "@nomicfoundation/hardhat-ethers";
import { expect } from "chai";
import { contracts, startLottery_config } from "../../globals";
import { EndTime, catchCustomErr, findEvent, readContract, sendFn } from "../../helpers";
import { claimTickets, getTicketIds, stepSSLottery } from "../helpers";

describe("Basic Flow", () => {
  // ----- //
  // Setup //
  // ----- //
  let endTime: bigint;
  let lottery_id: bigint;
  type Tickets = { numbers: bigint[]; ids?: bigint[] };
  const obj_wallet_name_tickets = {
    bob: { numbers: [234561n] },
  } as Record<WalletName, Tickets>;

  before(async () => {
    await stepSSLottery();
    endTime = await EndTime(999n);
    lottery_id = BigInt(await readContract("owner", "SSLottery", "currentLotteryId"));
  });

  // ---- //
  // Test //
  // ---- //

  it("Operator starts lottery", async () => {
    const startTx = await sendFn([
      "operator",
      "SSLottery",
      "startLottery",
      [
        endTime,
        startLottery_config.ticketPriceInUsd,
        startLottery_config.discountDivisor,
        startLottery_config.winnersPortion,
        startLottery_config.burnPortion,
        startLottery_config.rewardPortions,
      ],
    ]);
    const startReceipt = startTx[1];
    const lotteryOpenEvent = findEvent(startReceipt, "LotteryOpen");
    const prevLotteryId = lottery_id;
    lottery_id = lotteryOpenEvent.args[0];
    expect(lottery_id).to.equal(prevLotteryId + 1n, "Lottery ID should increment by 1");
  });

  it("Bob buys 1 ticket", async () => {
    const value = await contracts.SSLottery.calculateCurrentTotalPriceForBulkTickets(
      obj_wallet_name_tickets.bob.numbers.length
    );
    const buyTicketTx = await sendFn([
      "bob",
      "SSLottery",
      "buyTickets",
      [lottery_id, obj_wallet_name_tickets.bob.numbers],
      { value },
    ]).catch(catchCustomErr("SSLottery"));
    const buyTicketReceipt = buyTicketTx[1];
    const ticketsPurchaseEvent = findEvent(buyTicketReceipt, "TicketsPurchase");
    const nTickets = ticketsPurchaseEvent.args[2];
    expect(nTickets).to.equal(1n, "Bob should buy 1 ticket");
  });

  it("Injector injects funds", async () => {
    const value = await contracts.SSLottery.calculateCurrentTotalPriceForBulkTickets(1);
    await sendFn(["injector", "SSLottery", "injectFunds", [lottery_id], { value }]);
  });

  it("Operator closes lottery", async () => {
    // Wait for lottery to end
    await sendFn(["operator", "SSLottery", "forceCloseLottery", [lottery_id]]).catch(catchCustomErr("SSLottery"));
  });

  it("Operator draws final number", async () => {
    await sendFn(["operator", "SSLottery", "drawFinalNumberAndMakeLotteryClaimable", [lottery_id, true]]).catch(
      catchCustomErr("SSLottery")
    );
  });

  it("Bob gets his ticket IDs", async () => {
    const ticketIds = await getTicketIds(lottery_id, "bob", 1);
    obj_wallet_name_tickets.bob.ids = ticketIds;
  });

  it("Bob claims his tickets", async () => {
    await claimTickets(lottery_id, "bob", obj_wallet_name_tickets.bob.ids).catch(catchCustomErr("SSLottery"));
  });
});
