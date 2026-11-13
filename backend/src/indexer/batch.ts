import { and, eq, sql } from "drizzle-orm";

import type { ChainClient } from "../chain/client.ts";
import type { Database } from "../db/client.ts";
import { chainEvents, indexerCheckpoints } from "../db/schema.ts";
import { type ChainEventRow, type IndexedContract, readContractEvents } from "./events.ts";

export type IndexerDeps = { db: Database; chain: ChainClient; contract: IndexedContract; batchSize: bigint };

export type BatchResult =
  | { status: "indexed"; fromBlock: bigint; toBlock: bigint; events: number; finalized: bigint }
  | { status: "idle"; finalized: bigint };

// Последний полностью записанный блок или null, если indexer ещё не запускался.
export async function readCheckpoint(db: Database, contract: IndexedContract) {
  const [row] = await db
    .select({ lastBlock: indexerCheckpoints.lastBlock })
    .from(indexerCheckpoints)
    .where(
      and(
        eq(indexerCheckpoints.chainId, contract.chainId),
        eq(indexerCheckpoints.contractAddress, contract.address.toLowerCase()),
      ),
    );
  return row?.lastBlock ?? null;
}

// События и checkpoint — вместе или ничего: после сбоя не бывает ни сдвинутого checkpoint без событий,
// ни событий без checkpoint. Повтор пачки безопасен благодаря первичному ключу (chain_id, tx_hash, log_index).
export async function saveBatch(db: Database, contract: IndexedContract, rows: ChainEventRow[], toBlock: bigint) {
  await db.transaction(async (tx) => {
    if (rows.length > 0) await tx.insert(chainEvents).values(rows).onConflictDoNothing();
    await tx
      .insert(indexerCheckpoints)
      .values({ chainId: contract.chainId, contractAddress: contract.address.toLowerCase(), lastBlock: toBlock })
      .onConflictDoUpdate({
        target: [indexerCheckpoints.chainId, indexerCheckpoints.contractAddress],
        set: { lastBlock: toBlock, updatedAt: sql`now()` },
        // Checkpoint не идёт назад, даже если параллельно запущен второй indexer с меньшей пачкой.
        setWhere: sql`${indexerCheckpoints.lastBlock} < ${toBlock}`,
      });
  });
}

// Одна пачка: от блока после checkpoint, не дальше batchSize блоков и не дальше finalized.
// Ошибка на любом шаге не трогает checkpoint, поэтому следующий запуск повторит ту же пачку.
export async function indexNextBatch({ db, chain, contract, batchSize }: IndexerDeps): Promise<BatchResult> {
  // finalized-блок Ethereum PoS не откатывается: indexer не хранит хэши блоков и не пишет откат при reorg.
  const finalized = (await chain.getBlock({ blockTag: "finalized" })).number;
  const fromBlock = ((await readCheckpoint(db, contract)) ?? contract.deployBlock - 1n) + 1n;
  if (fromBlock > finalized) return { status: "idle", finalized };

  const lastInBatch = fromBlock + batchSize - 1n;
  const toBlock = lastInBatch < finalized ? lastInBatch : finalized;
  const rows = await readContractEvents(chain, contract, fromBlock, toBlock);

  await saveBatch(db, contract, rows, toBlock);

  return { status: "indexed", fromBlock, toBlock, events: rows.length, finalized };
}
