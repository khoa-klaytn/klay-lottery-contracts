import "@nomicfoundation/hardhat-ethers";
import { expect } from "chai";
import { contracts, startLottery_config, wallets } from "../globals";
import { ConsoleColor, EndTime, catchCustomErr, colorInfo, findEvent, grayLog, readContract, sendFn } from "../helpers";

describe("Basic Flow", () => {
  // ----- //
  // Setup //
  // ----- //
  let endTime: bigint;
  let lottery_id: bigint;
  const finalNumber = 234561n;
  const objAccountTicketIds = {
    bob: [finalNumber],
    carol: [234560n, 234562n],
  };

  before(async () => {
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
    const value = await contracts.SSLottery.calculateCurrentTotalPriceForBulkTickets(objAccountTicketIds.bob.length);
    const buyTicketTx = await sendFn([
      "bob",
      "SSLottery",
      "buyTickets",
      [lottery_id, objAccountTicketIds.bob],
      { value },
    ]).catch(catchCustomErr("SSLottery"));
    const buyTicketReceipt = buyTicketTx[1];
    const ticketsPurchaseEvent = findEvent(buyTicketReceipt, "TicketsPurchase");
    const nTickets = ticketsPurchaseEvent.args[2];
    expect(nTickets).to.equal(1n, "Bob should buy 1 ticket");
  });

  it("Carol buys 2 tickets", async () => {
    const value = await contracts.SSLottery.calculateCurrentTotalPriceForBulkTickets(objAccountTicketIds.carol.length);
    const buyTicketTx = await sendFn([
      "carol",
      "SSLottery",
      "buyTickets",
      [lottery_id, objAccountTicketIds.carol],
      { value },
    ]).catch(catchCustomErr("SSLottery"));
    const buyTicketReceipt = buyTicketTx[1];
    const ticketsPurchaseEvent = findEvent(buyTicketReceipt, "TicketsPurchase");
    const nTickets = ticketsPurchaseEvent.args[2];
    expect(nTickets).to.equal(2n, "Carol should buy 2 tickets");
  });

  it("Injector injects funds", async () => {
    const value = await contracts.SSLottery.calculateCurrentTotalPriceForBulkTickets(1);
    await sendFn(["injector", "SSLottery", "injectFunds", [lottery_id], { value }]);
  });

  it("Operator closes lottery", async () => {
    // Wait for lottery to end
    await sendFn(["operator", "SSLottery", "forceCloseLottery", [lottery_id]]).catch(catchCustomErr("SSLottery"));
  });

  it("Operator draws lottery", async () => {
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

  async function claimTickets(wallet_name: WalletName, size: number) {
    const tickets = await contracts.SSLottery.viewUserInfoForLotteryId(
      wallets[wallet_name].address,
      lottery_id,
      0,
      size
    );
    const ticketIds = tickets[0].toArray();
    grayLog(`Ticket IDs: ${ticketIds}`);
    const claimTicketsTx = await sendFn([wallet_name, "SSLottery", "claimTickets", [lottery_id, ticketIds]]).catch(
      catchCustomErr("SSLottery")
    );
    const claimTicketsReceipt = claimTicketsTx[1];
    const ticketsClaimEvent = findEvent(claimTicketsReceipt, "TicketsClaim");
    colorInfo("Reward", ticketsClaimEvent.args[1], ConsoleColor.FgGreen);
  }

  it("Bob claims his tickets", async () => {
    await claimTickets("bob", 1).catch(catchCustomErr("SSLottery"));
  });

  it("Bob cannot claim claimed tickets", async () => {
    try {
      await claimTickets("bob", 1);
      throw Error("Was supposed to throw");
    } catch (e) {
      expect(e).instanceOf(Error);
    }
  });

  it("Carol claims her tickets", async () => {
    await claimTickets("carol", 2).catch(catchCustomErr("SSLottery"));
  });
});
