import { contracts, wallets } from "../globals";
import { ConsoleColor, catchCustomErr, colorInfo, findEvent, grayLog, sendFn } from "../helpers";

export function stepSSLottery() {
  return sendFn(["owner", "SSLottery", "step"]);
}

export async function getTicketIds(lottery_id: bigint, wallet_name: WalletName, size: number) {
  const tickets = await contracts.SSLottery.viewUserInfoForLotteryId(wallets[wallet_name].address, lottery_id, 0, size);
  const ticketIds = tickets[0].toArray();
  return ticketIds;
}

export async function claimTickets(lottery_id: bigint, wallet_name: WalletName, ticketIds: bigint[]) {
  grayLog(`Ticket IDs: ${ticketIds}`);
  const claimTicketsTx = await sendFn([wallet_name, "SSLottery", "claimTickets", [lottery_id, ticketIds]]).catch(
    catchCustomErr("SSLottery")
  );
  const claimTicketsReceipt = claimTicketsTx[1];
  const ticketsClaimEvent = findEvent(claimTicketsReceipt, "TicketsClaim");
  colorInfo("Reward", ticketsClaimEvent.args[1], ConsoleColor.FgGreen);
}
