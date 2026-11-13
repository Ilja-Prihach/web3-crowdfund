import { type Address, isAddress } from "viem";

import type { ChainClient } from "../chain/client.ts";
import { crowdfunding } from "../chain/contract.ts";
import type { chainEvents } from "../db/schema.ts";

export type ChainEventRow = typeof chainEvents.$inferInsert;

// Какой контракт читает indexer. В приложении — V2 в Sepolia, в тестах — свежий контракт на Anvil.
export type IndexedContract = { chainId: number; address: Address; deployBlock: bigint };

// Аргумент события → строка для jsonb: в JSON нет bigint, а адреса в базе хранятся строчными буквами.
function serializeArg(value: unknown) {
  if (typeof value === "string" && isAddress(value)) return value.toLowerCase();
  if (typeof value === "bigint") return value.toString();
  throw new Error(`Unexpected event argument ${String(value)}`);
}

// Читает события V2 в диапазоне блоков включительно и превращает их в строки chain_events.
// strict: лог, который не разобрался по ABI, — ошибка, а не тихо пропущенное событие.
export async function readContractEvents(chain: ChainClient, contract: IndexedContract, fromBlock: bigint, toBlock: bigint) {
  const logs = await chain.getContractEvents({
    address: contract.address,
    abi: crowdfunding.abi,
    fromBlock,
    toBlock,
    strict: true,
  });

  return logs.map((log): ChainEventRow => {
    // Финализированный лог всегда в блоке; null бывает только у ожидающих транзакций.
    if (log.blockNumber === null || log.transactionHash === null || log.logIndex === null) {
      throw new Error("Log without block position: only mined logs can be indexed");
    }
    const { campaignId, ...rest } = log.args;
    return {
      chainId: contract.chainId,
      contractAddress: log.address.toLowerCase(),
      blockNumber: log.blockNumber,
      txHash: log.transactionHash,
      logIndex: log.logIndex,
      eventName: log.eventName,
      campaignId,
      args: Object.fromEntries(Object.entries(rest).map(([name, value]) => [name, serializeArg(value)])),
    };
  });
}
