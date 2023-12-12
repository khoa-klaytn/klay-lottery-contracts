import "@nomicfoundation/hardhat-ethers";
import { expect } from "chai";
import { contracts, startLottery_config } from "../../globals";
import { EndTime, catchCustomErr, depositPrepayment, findEvent, readContract, sendFn } from "../../helpers";
import { claimTickets, getTicketIds, stepSSLottery } from "../helpers";

describe("setFinalNumber to test winners", () => {
  // ----- //
  // Setup //
  // ----- //
  let endTime: bigint;
  let lottery_id: bigint;
  const finalNumber = 234561n;
  type Tickets = { numbers: bigint[]; ids?: bigint[] };
  const obj_wallet_name_tickets = {
    bob: { numbers: [finalNumber] },
    carol: { numbers: [234560n, 234562n] },
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
        startLottery_config.initialFree,
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

  it("Carol buys 2 tickets", async () => {
    const value = await contracts.SSLottery.calculateCurrentTotalPriceForBulkTickets(
      obj_wallet_name_tickets.carol.numbers.length
    );
    const buyTicketTx = await sendFn([
      "carol",
      "SSLottery",
      "buyTickets",
      [lottery_id, obj_wallet_name_tickets.carol.numbers],
      { value },
    ]).catch(catchCustomErr("SSLottery"));
    const buyTicketReceipt = buyTicketTx[1];
    const ticketsPurchaseEvent = findEvent(buyTicketReceipt, "TicketsPurchase");
    const nTickets = ticketsPurchaseEvent.args[2];
    expect(nTickets).to.equal(2n, "Carol should buy 2 tickets");
  });

  it("Operator closes lottery", async () => {
    const fee = await readContract("owner", "VRFConsumer", "estimateFee");
    await depositPrepayment(fee);
    // Wait for lottery to end
    await sendFn(["operator", "SSLottery", "forceCloseLottery", [lottery_id]]).catch(catchCustomErr("SSLottery"));
  });

  it("Operator sets final number", async () => {
    const tx = await sendFn([
      "operator",
      "SSLottery",
      "setFinalNumberAndMakeLotteryClaimable",
      [lottery_id, true, finalNumber],
    ]).catch(catchCustomErr("SSLottery"));
    const receipt = tx[1];
    const lotteryNumberDrawnEvent = findEvent(receipt, "LotteryNumberDrawn");
    expect(lotteryNumberDrawnEvent.args[1]).eq(finalNumber);
    expect(lotteryNumberDrawnEvent.args[2]).eq(1n, "Should be 1 winner");

    const lottery = await readContract("bob", "SSLottery", "viewLottery", [lottery_id]);
    const { countWinnersPerBracket, numBrackets } = lottery;

    expect(countWinnersPerBracket[numBrackets]).eq(1n);
    expect(countWinnersPerBracket[0]).eq(2n);
  });

  it("Bob gets his ticket IDs", async () => {
    const ticketIds = await getTicketIds(lottery_id, "bob", 1);
    obj_wallet_name_tickets.bob.ids = ticketIds;
  });

  it("Carol gets her ticket IDs", async () => {
    const ticketIds = await getTicketIds(lottery_id, "carol", 2);
    obj_wallet_name_tickets.carol.ids = ticketIds;
  });

  it("Carol cannot claim Bob's tickets", async () => {
    try {
      await claimTickets(
        "carol",
        Array(obj_wallet_name_tickets.bob.ids.length).fill(lottery_id),
        obj_wallet_name_tickets.bob.ids
      );
      throw Error("Was supposed to throw");
    } catch (e) {
      expect(e).instanceOf(Error);
    }
  });

  it("Bob claims his tickets", async () => {
    await claimTickets(
      "bob",
      Array(obj_wallet_name_tickets.bob.ids.length).fill(lottery_id),
      obj_wallet_name_tickets.bob.ids
    ).catch(catchCustomErr("SSLottery"));
  });

  it("Bob cannot claim claimed tickets", async () => {
    try {
      await claimTickets(
        "bob",
        Array(obj_wallet_name_tickets.bob.ids.length).fill(lottery_id),
        obj_wallet_name_tickets.bob.ids
      );
      throw Error("Was supposed to throw");
    } catch (e) {
      expect(e).instanceOf(Error);
    }
  });

  it("Carol claims her tickets", async () => {
    await claimTickets(
      "carol",
      Array(obj_wallet_name_tickets.carol.ids.length).fill(lottery_id),
      obj_wallet_name_tickets.carol.ids
    ).catch(catchCustomErr("SSLottery"));
  });
});
