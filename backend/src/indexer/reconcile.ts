import { and, eq, sql } from "drizzle-orm";

import type { ChainClient } from "../chain/client.ts";
import { crowdfunding } from "../chain/contract.ts";
import type { Database } from "../db/client.ts";
import { campaignMetadata, campaigns, contributions, fundingModes } from "../db/schema.ts";
import { readCheckpoint } from "./batch.ts";
import type { IndexedContract } from "./events.ts";
import { lockContract } from "./projection.ts";

type ReconcileDeps = { db: Database; chain: ChainClient; contract: IndexedContract };

export type Mismatch = { campaignId: string; field: string; projection: string; contract: string };
export type ReconcileResult = { checkedBlock: bigint; campaigns: number; mismatches: Mismatch[] };

// MAX_PAGE_SIZE контракта.
const pageSize = 20n;

// Сверяет проекции с контрактом на блоке checkpoint: ровно это состояние проекции и описывают.
// Ловит то, чего не видно по журналу: узел, вернувший на старые блоки пустой список вместо ошибки, потерял бы
// события молча. Внутри базы проверяет, что сумма вкладов кампании равна её total_raised.
export async function reconcileProjections({ db, chain, contract }: ReconcileDeps): Promise<ReconcileResult | null> {
  const address = contract.address.toLowerCase();
  // Снимок базы под блокировкой: checkpoint и проекции из одной точки, пачка indexer не вклинится между чтениями.
  const snapshot = await db.transaction(async (tx) => {
    await lockContract(tx, contract);
    const checkpoint = await readCheckpoint(tx, contract);
    const rows = await tx
      .select({ campaign: campaigns, metadata: campaignMetadata })
      .from(campaigns)
      .leftJoin(
        campaignMetadata,
        and(
          eq(campaignMetadata.chainId, campaigns.chainId),
          eq(campaignMetadata.contractAddress, campaigns.contractAddress),
          eq(campaignMetadata.campaignId, campaigns.campaignId),
        ),
      )
      .where(and(eq(campaigns.chainId, contract.chainId), eq(campaigns.contractAddress, address)));
    const sums = await tx
      .select({ campaignId: contributions.campaignId, total: sql<string>`sum(${contributions.amount})` })
      .from(contributions)
      .where(and(eq(contributions.chainId, contract.chainId), eq(contributions.contractAddress, address)))
      .groupBy(contributions.campaignId);
    return { checkpoint, rows, sums };
  });
  if (snapshot.checkpoint === null) return null;
  const blockNumber = snapshot.checkpoint;

  // Сеть — после транзакции: блокировка не держится, пока ждём узел.
  const read = { address: contract.address, abi: crowdfunding.abi, blockNumber } as const;
  const count = await chain.readContract({ ...read, functionName: "nextCampaignId" });
  const onChain = [];
  for (let offset = 0n; offset < count; offset += pageSize) {
    onChain.push(...(await chain.readContract({ ...read, functionName: "getCampaigns", args: [offset, pageSize] })));
  }

  const mismatches: Mismatch[] = [];
  const differ = (campaignId: bigint, field: string, projection: unknown, expected: unknown) => {
    if (String(projection) !== String(expected)) {
      mismatches.push({ campaignId: campaignId.toString(), field, projection: String(projection), contract: String(expected) });
    }
  };

  const projected = new Map(snapshot.rows.map((row) => [row.campaign.campaignId, row]));
  for (const { id, campaign } of onChain) {
    const row = projected.get(id);
    projected.delete(id);
    if (!row) {
      differ(id, "exists", false, true);
      continue;
    }
    differ(id, "creator", row.campaign.creator, campaign.creator.toLowerCase());
    differ(id, "goal", row.campaign.goal, campaign.goal);
    differ(id, "deadline", row.campaign.deadline, campaign.deadline);
    differ(id, "totalRaised", row.campaign.totalRaised, campaign.totalRaised);
    differ(id, "cancelled", row.campaign.cancelled, campaign.cancelled);
    differ(id, "fundsWithdrawn", row.campaign.fundsWithdrawn, campaign.fundsWithdrawn);
    differ(id, "fundingMode", row.metadata?.fundingMode, fundingModes[campaign.fundingMode]);
    differ(id, "title", row.metadata?.title, campaign.title);
    differ(id, "description", row.metadata?.description, campaign.description);
  }
  // Кампании, которых в контракте на этом блоке нет.
  for (const id of projected.keys()) differ(id, "exists", true, false);

  // Сумма текущих вкладов кампании равна её totalRaised — так устроен контракт.
  const sums = new Map(snapshot.sums.map((row) => [row.campaignId, BigInt(row.total)]));
  for (const { campaign } of snapshot.rows) {
    differ(campaign.campaignId, "sum(contributions)", sums.get(campaign.campaignId) ?? 0n, campaign.totalRaised);
  }

  return { checkedBlock: blockNumber, campaigns: onChain.length, mismatches };
}

type ReconcilerLog = {
  info: (fields: object, message: string) => void;
  warn: (fields: object, message: string) => void;
  error: (fields: object, message: string) => void;
};

// Сверка из цикла indexer: при первом догоне finalized после старта, затем не чаще раза в intervalMs.
// Сбой сети — предупреждение и повтор при следующем простое; расхождение — громкая ошибка, indexer продолжает работу.
export function createReconciler({
  reconcile,
  log,
  intervalMs,
  now = Date.now,
}: {
  reconcile: () => Promise<ReconcileResult | null>;
  log: ReconcilerLog;
  intervalMs: number;
  now?: () => number;
}) {
  let lastRunAt: number | null = null;

  return async () => {
    if (lastRunAt !== null && now() - lastRunAt < intervalMs) return;
    try {
      const result = await reconcile();
      lastRunAt = now();
      if (result === null) return;
      const fields = { checkedBlock: result.checkedBlock.toString(), campaigns: result.campaigns };
      if (result.mismatches.length === 0) {
        log.info(fields, "projections match the contract");
      } else {
        // Список ограничен: при полной потере событий он был бы размером с каталог.
        log.error(
          { ...fields, mismatchCount: result.mismatches.length, mismatches: result.mismatches.slice(0, 20) },
          "projections differ from the contract: run npm run indexer:rebuild after fixing the cause",
        );
      }
    } catch (error) {
      log.warn({ err: error }, "projection reconciliation failed");
    }
  };
}
