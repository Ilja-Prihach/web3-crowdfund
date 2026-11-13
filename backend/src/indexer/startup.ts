import { setTimeout as delay } from "node:timers/promises";

import { BaseError } from "viem";

import type { ChainClient } from "../chain/client.ts";
import type { IndexedContract } from "./events.ts";

// Причина отказа без URL узла: в нём может быть ключ провайдера. details — ответ узла, например «pruned history».
const reason = (error: unknown) =>
  error instanceof BaseError ? [error.shortMessage, error.details].filter(Boolean).join(" ") : String(error);

// Проверки перед первым чтением: узел той сети и он помнит историю с блока deploy.
// Без них indexer молча записал бы чужие логи под chain ID Sepolia или застрял бы на узле с обрезанной историей.
// История проверяется несколько раз: 1rpc — балансировщик, и отдельный узел за ним иногда отвечает 4444.
export async function checkNode(
  chain: ChainClient,
  contract: IndexedContract,
  batchSize: bigint,
  { attempts = 3, retryDelayMs = 2_000 } = {},
) {
  const chainId = await chain.getChainId();
  if (chainId !== contract.chainId) {
    throw new Error(`SEPOLIA_RPC_URL points to chain ${chainId}, expected ${contract.chainId}`);
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      // Первая пачка с блока deploy: узел с обрезанной историей отвечает ошибкой (publicnode — 4444).
      // Окно не дальше последнего блока: блоки «из будущего» узел тоже отклоняет.
      const latest = await chain.getBlockNumber({ cacheTime: 0 });
      const windowEnd = contract.deployBlock + batchSize - 1n;
      await chain.getLogs({
        address: contract.address,
        fromBlock: contract.deployBlock,
        toBlock: windowEnd < latest ? windowEnd : latest,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(retryDelayMs);
    }
  }

  throw new Error(
    `SEPOLIA_RPC_URL does not return logs from deploy block ${contract.deployBlock} ` +
      `after ${attempts} attempts: ${reason(lastError)}. See docs/gotchas.md#public-rpc-prunes-log-history`,
  );
}
