import { and, asc, count, desc, eq, ilike, inArray, or, type SQL, sql } from "drizzle-orm";

import type { Database } from "../../db/client.ts";
import { campaignMetadata, campaigns, contributions, type fundingModes } from "../../db/schema.ts";
import { readCheckpoint } from "../../indexer/batch.ts";
import type { IndexedContract } from "../../indexer/events.ts";

// Статусы в порядке enum CampaignStatus контракта.
export const campaignStatuses = ["active", "successful", "failed", "withdrawn", "cancelled"] as const;
export type CampaignStatus = (typeof campaignStatuses)[number];
export const catalogSorts = ["newest", "oldest", "raised"] as const;
export type CatalogSort = (typeof catalogSorts)[number];

export type CatalogQuery = {
  q?: string;
  statuses?: CampaignStatus[];
  mode?: (typeof fundingModes)[number];
  sort: CatalogSort;
  limit: number;
  offset: number;
  // Unix-время в секундах, относительно которого считается статус: маршрут передаёт текущее, тест — своё.
  nowSeconds: number;
};

// Статус по правилам _getCampaignStatus контракта, в том же порядке проверок. Не хранится:
// Active и Failed зависят от времени. Граница deadline = now — уже провал, как block.timestamp < deadline.
const statusAt = (nowSeconds: number) => sql<CampaignStatus>`case
  when ${campaigns.cancelled} then 'cancelled'
  when ${campaigns.fundsWithdrawn} then 'withdrawn'
  when ${campaigns.totalRaised} >= ${campaigns.goal} then 'successful'
  when ${campaignMetadata.fundingMode} = 'open_ended' then 'active'
  when ${nowSeconds}::numeric < ${campaigns.deadline} then 'active'
  else 'failed'
end`;

// В LIKE символы % и _ значат «что угодно»; введённые пользователем, они ищутся буквально.
const likePattern = (text: string) => `%${text.replace(/[\\%_]/g, "\\$&")}%`;

const orderBy: Record<CatalogSort, SQL[]> = {
  newest: [desc(campaigns.campaignId)],
  oldest: [asc(campaigns.campaignId)],
  // Второй ключ — id: при равных суммах кампания не перескакивает между страницами.
  raised: [desc(campaigns.totalRaised), desc(campaigns.campaignId)],
};

function selection(nowSeconds: number) {
  return {
    campaignId: campaigns.campaignId,
    creator: campaigns.creator,
    fundingMode: campaignMetadata.fundingMode,
    title: campaignMetadata.title,
    description: campaignMetadata.description,
    goal: campaigns.goal,
    deadline: campaigns.deadline,
    totalRaised: campaigns.totalRaised,
    status: statusAt(nowSeconds),
    createdBlock: campaigns.createdBlock,
    // Участники — адреса с текущим вкладом: полностью вернувшие деньги не считаются.
    donors: sql<number>`(
      select count(*)::int from ${contributions}
      where ${contributions.chainId} = ${campaigns.chainId}
        and ${contributions.contractAddress} = ${campaigns.contractAddress}
        and ${contributions.campaignId} = ${campaigns.campaignId}
        and ${contributions.amount} > 0
    )`,
  };
}

const metadataJoin = and(
  eq(campaignMetadata.chainId, campaigns.chainId),
  eq(campaignMetadata.contractAddress, campaigns.contractAddress),
  eq(campaignMetadata.campaignId, campaigns.campaignId),
);

const ofContract = (contract: IndexedContract) =>
  and(eq(campaigns.chainId, contract.chainId), eq(campaigns.contractAddress, contract.address.toLowerCase()));

// Страница, общее число и checkpoint читаются из одного снимка базы (REPEATABLE READ):
// пачка indexer между запросами не сделает total несогласованным со страницей.
export const snapshot = { isolationLevel: "repeatable read", accessMode: "read only" } as const;

export async function listCampaigns(db: Database, contract: IndexedContract, query: CatalogQuery) {
  const filters = [ofContract(contract)];
  if (query.q) {
    const pattern = likePattern(query.q);
    filters.push(or(ilike(campaignMetadata.title, pattern), ilike(campaignMetadata.description, pattern)));
  }
  if (query.mode) filters.push(eq(campaignMetadata.fundingMode, query.mode));
  // Фильтр по статусу — в SQL до пагинации, иначе total и страницы не совпали бы с отбором.
  if (query.statuses?.length) filters.push(inArray(statusAt(query.nowSeconds), query.statuses));
  const where = and(...filters);

  return db.transaction(async (tx) => {
    const items = await tx
      .select(selection(query.nowSeconds))
      .from(campaigns)
      .innerJoin(campaignMetadata, metadataJoin)
      .where(where)
      .orderBy(...orderBy[query.sort])
      .limit(query.limit)
      .offset(query.offset);
    const [totals] = await tx
      .select({ total: count() })
      .from(campaigns)
      .innerJoin(campaignMetadata, metadataJoin)
      .where(where);
    return { items, total: totals?.total ?? 0, finalizedBlock: await readCheckpoint(tx, contract) };
  }, snapshot);
}

export async function findCampaign(db: Database, contract: IndexedContract, campaignId: bigint, nowSeconds: number) {
  return db.transaction(async (tx) => {
    const [campaign] = await tx
      .select(selection(nowSeconds))
      .from(campaigns)
      .innerJoin(campaignMetadata, metadataJoin)
      .where(and(ofContract(contract), eq(campaigns.campaignId, campaignId)));
    return { campaign: campaign ?? null, finalizedBlock: await readCheckpoint(tx, contract) };
  }, snapshot);
}
