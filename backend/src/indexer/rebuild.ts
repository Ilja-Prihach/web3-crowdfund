import { and, asc, eq, isNull } from "drizzle-orm";

import type { ChainClient } from "../chain/client.ts";
import type { Database } from "../db/client.ts";
import { campaignMetadata, campaigns, chainEvents } from "../db/schema.ts";
import { readCheckpoint } from "./batch.ts";
import type { IndexedContract } from "./events.ts";
import { readCampaignMetadata } from "./metadata.ts";
import { applyEvents, lockContract } from "./projection.ts";

type RebuildDeps = { db: Database; chain: ChainClient; contract: IndexedContract };

// Стирает проекции контракта и заново воспроизводит весь журнал chain_events. События журнала не меняются.
// Сеть нужна только для того, чего нет в базе: метаданных и времени блока у событий, записанных до миграций
// 0002 и 0003. Время блока дописывается в журнал — это такие же сырые данные сети.
export async function rebuildProjections({ db, chain, contract }: RebuildDeps) {
  const contractKey = and(
    eq(chainEvents.chainId, contract.chainId),
    eq(chainEvents.contractAddress, contract.address.toLowerCase()),
  );

  const missing = await db
    .select({ campaignId: chainEvents.campaignId })
    .from(chainEvents)
    .leftJoin(
      campaignMetadata,
      and(
        eq(campaignMetadata.chainId, chainEvents.chainId),
        eq(campaignMetadata.contractAddress, chainEvents.contractAddress),
        eq(campaignMetadata.campaignId, chainEvents.campaignId),
      ),
    )
    .where(and(contractKey, eq(chainEvents.eventName, "CampaignCreated"), isNull(campaignMetadata.campaignId)));
  // Checkpoint не меньше блока любого события журнала: на нём все кампании журнала уже существуют.
  const checkpoint = await readCheckpoint(db, contract);
  const metadata =
    missing.length > 0 && checkpoint !== null
      ? await readCampaignMetadata(
          chain,
          contract,
          missing.map((row) => row.campaignId),
          checkpoint,
        )
      : [];

  const untimed = await db
    .selectDistinct({ blockNumber: chainEvents.blockNumber })
    .from(chainEvents)
    .where(and(contractKey, isNull(chainEvents.blockTimestamp)));
  const times: { blockNumber: bigint; blockTimestamp: Date }[] = [];
  for (const { blockNumber } of untimed) {
    const { timestamp } = await chain.getBlock({ blockNumber });
    times.push({ blockNumber, blockTimestamp: new Date(Number(timestamp) * 1000) });
  }

  return db.transaction(async (tx) => {
    // Пачка indexer ждёт, пока пересборка не закончится, и наоборот.
    await lockContract(tx, contract);
    if (metadata.length > 0) await tx.insert(campaignMetadata).values(metadata).onConflictDoNothing();
    for (const { blockNumber, blockTimestamp } of times) {
      await tx
        .update(chainEvents)
        .set({ blockTimestamp })
        .where(and(contractKey, eq(chainEvents.blockNumber, blockNumber), isNull(chainEvents.blockTimestamp)));
    }
    // Вклады удаляются каскадом вместе с кампаниями.
    await tx
      .delete(campaigns)
      .where(and(eq(campaigns.chainId, contract.chainId), eq(campaigns.contractAddress, contract.address.toLowerCase())));
    const events = await tx
      .select()
      .from(chainEvents)
      .where(contractKey)
      .orderBy(asc(chainEvents.blockNumber), asc(chainEvents.logIndex));
    await applyEvents(tx, contract, events);
    return { events: events.length, fetchedMetadata: metadata.length, fetchedBlockTimes: times.length };
  });
}
