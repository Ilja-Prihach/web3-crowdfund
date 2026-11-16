import { type Address, isAddress } from "viem";

import type { ChainClient } from "../chain/client.ts";
import { crowdfunding } from "../chain/contract.ts";
import type { chainEvents } from "../db/schema.ts";

export type ChainEventRow = typeof chainEvents.$inferInsert;

// Какой контракт читает indexer. В приложении — V2 в Sepolia, в тестах — свежий контракт на Anvil.
export type IndexedContract = { chainId: number; address: Address; deployBlock: bigint };

export const sepoliaCrowdfunding: IndexedContract = {
  chainId: crowdfunding.chain.id,
  address: crowdfunding.address,
  deployBlock: crowdfunding.deployBlock,
};

// Аргумент события → строка для jsonb: в JSON нет bigint, а адреса в базе хранятся строчными буквами.
function serializeArg(value: unknown) {
  if (typeof value === "string" && isAddress(value)) return value.toLowerCase();
  if (typeof value === "bigint") return value.toString();
  throw new Error(`Unexpected event argument ${String(value)}`);
}

// Время блока из лога, а если узел его не прислал — из самого блока. Tenderly и Anvil отдают blockTimestamp
// в eth_getLogs, поэтому обычно лишних запросов нет; иначе — один getBlock на каждый блок с событиями.
async function blockTimes(chain: ChainClient, logs: { blockNumber: bigint; blockTimestamp?: bigint | undefined }[]) {
  const times = new Map<bigint, bigint>();
  for (const log of logs) if (log.blockTimestamp !== undefined) times.set(log.blockNumber, log.blockTimestamp);
  for (const blockNumber of new Set(logs.map((log) => log.blockNumber))) {
    if (!times.has(blockNumber)) times.set(blockNumber, (await chain.getBlock({ blockNumber })).timestamp);
  }
  return times;
}

const toDate = (seconds: bigint) => new Date(Number(seconds) * 1000);

// Читает события V2 в диапазоне блоков включительно и превращает их в строки chain_events.
// strict: лог, который не разобрался по ABI, — ошибка, а не тихо пропущенное событие.
export async function readContractEvents(
  chain: ChainClient,
  contract: IndexedContract,
  fromBlock: bigint,
  toBlock: bigint,
) {
  const logs = await chain.getContractEvents({
    address: contract.address,
    abi: crowdfunding.abi,
    fromBlock,
    toBlock,
    strict: true,
  });

  const mined = logs.map((log) => {
    // Финализированный лог всегда в блоке; null бывает только у ожидающих транзакций.
    if (log.blockNumber === null || log.transactionHash === null || log.logIndex === null) {
      throw new Error("Log without block position: only mined logs can be indexed");
    }
    return { ...log, blockNumber: log.blockNumber, transactionHash: log.transactionHash, logIndex: log.logIndex };
  });
  const times = await blockTimes(chain, mined);

  return mined.map((log): ChainEventRow => {
    const { campaignId, ...rest } = log.args;
    const blockTimestamp = times.get(log.blockNumber);
    return {
      chainId: contract.chainId,
      contractAddress: log.address.toLowerCase(),
      blockNumber: log.blockNumber,
      blockTimestamp: blockTimestamp === undefined ? null : toDate(blockTimestamp),
      txHash: log.transactionHash,
      logIndex: log.logIndex,
      eventName: log.eventName,
      campaignId,
      args: Object.fromEntries(Object.entries(rest).map(([name, value]) => [name, serializeArg(value)])),
    };
  });
}
