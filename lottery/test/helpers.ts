import { ethers } from "ethers";
import { time } from "@openzeppelin/test-helpers";
import { contracts, wallets } from "./globals";

export async function readContract(
  wallet_name: WalletName,
  contract_name: ContractName,
  fn_name: string,
  _args?: any[]
) {
  const args = _args || [];

  const signer = contracts[contract_name].connect(wallets[wallet_name]);
  const fn = signer[fn_name as any];
  const response = await fn(...args);
  console.info(`(read)${contract_name}.${fn_name}@${wallet_name}: ${response}`);
  return response;
}

export function batchReadContract<Calls extends [string, any?][]>(
  wallet_name: WalletName,
  contract_name: ContractName,
  calls: Calls
) {
  if (calls.length === 0) return [];

  if (calls.length === 1) {
    const [fn_name, _args] = calls[0];
    return [readContract(wallet_name, contract_name, fn_name, _args)];
  }
  return calls.map(([fn_name, _args]) => readContract(wallet_name, contract_name, fn_name, _args));
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
  wallet_name: WalletName,
  contract_name: ContractName,
  fn_name: string,
  _args?: any[],
  overrides?: ethers.Overrides
) {
  const args = _args || [];

  const signer = contracts[contract_name].connect(wallets[wallet_name]);
  const fn = signer[fn_name];
  let response: ethers.TransactionResponse;
  if (overrides) {
    console.info("Overrides: ", overrides);
    response = await fn(...args, overrides);
  } else {
    response = await fn(...args);
  }
  console.info(`${contract_name}.${fn_name}@${wallet_name}: ${response.hash}`);
  return response;
}

type _SendFnP = Parameters<typeof _sendFn>;
type _SendFnR = ReturnType<typeof _sendFn>;
type WaitResponseR = ReturnType<typeof waitResponse>;
export interface sendFn {
  (a: _SendFnP, wait?: true): WaitResponseR;
  (a: _SendFnP, wait: false): _SendFnR;
}
export async function sendFn(a: _SendFnP, wait = true) {
  const response = await _sendFn(...a);
  if (wait) {
    return waitResponse(response);
  }
  return response;
}

export function sleep(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

export async function EndTime(lengthLottery: bigint) {
  return BigInt(await time.latest()) + lengthLottery;
}

export function catchCustomErr(contract_name: ContractName) {
  function catchCustomErr_(err) {
    if (err instanceof Error) {
      if ("data" in err && ethers.isBytesLike(err.data)) {
        const customErr = contracts[contract_name].interface.parseError(err.data);
        console.error(customErr);
      }
    }
    throw err;
  }
  return catchCustomErr_;
}

export function findEvent(receipt: ethers.TransactionReceipt, _eventName: string) {
  let event: ethers.LogDescription;
  const eventName = contracts.KlayLottery.interface.getEventName(_eventName);
  for (const log of receipt.logs) {
    const parsedLog = contracts.KlayLottery.interface.parseLog({
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
