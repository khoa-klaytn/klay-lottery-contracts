import { expect } from "chai";
import { startLottery_config } from "../globals";
import { EndTime, sendFn } from "../helpers";

describe("startLottery", () => {
  let endTime: bigint;

  before(async () => {
    endTime = await EndTime(999n);
  });

  it("rejects descending rewardPortions", async () => {
    try {
      await sendFn([
        "operator",
        "SSLottery",
        "startLottery",
        [
          endTime,
          startLottery_config.ticketPriceInUsd,
          startLottery_config.discountDivisor,
          startLottery_config.winnersPortion,
          startLottery_config.burnPortion,
          ["1", "3", "2"], // 2 < 3
        ],
      ]);
      throw Error("Was supposed to throw");
    } catch (e) {
      expect(e).instanceOf(Error);
    }
  });

  it("rejects if allWinnersRewardPortion < rewardPortions[1]", async () => {
    try {
      await sendFn([
        "operator",
        "SSLottery",
        "startLottery",
        [
          endTime,
          startLottery_config.ticketPriceInUsd,
          startLottery_config.discountDivisor,
          startLottery_config.winnersPortion,
          startLottery_config.burnPortion,
          ["1", "2", "3"], // 1 + 2 + 3 = 6; 10000 - 6 = 9994; 1 < 9994
        ],
      ]);
      throw Error("Was supposed to throw");
    } catch (e) {
      expect(e).instanceOf(Error);
    }
  });

  it("rejects too short rewardPortions", async () => {
    try {
      await sendFn([
        "operator",
        "SSLottery",
        "startLottery",
        [
          endTime,
          startLottery_config.ticketPriceInUsd,
          startLottery_config.discountDivisor,
          startLottery_config.winnersPortion,
          startLottery_config.burnPortion,
          ["1", "2"],
        ],
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
        "SSLottery",
        "startLottery",
        [
          endTime,
          startLottery_config.ticketPriceInUsd,
          startLottery_config.discountDivisor,
          startLottery_config.winnersPortion,
          startLottery_config.burnPortion,
          ["1", "2", "3", "4", "5", "6", "7"],
        ],
      ]);
      throw Error("Was supposed to throw");
    } catch (e) {
      expect(e).instanceOf(Error);
    }
  });
});
