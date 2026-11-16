import { and, desc, eq, sql } from "drizzle-orm";

import type { Database } from "../../db/client.ts";
import { campaigns, chainEvents, contributions } from "../../db/schema.ts";
import { readCheckpoint } from "../../indexer/batch.ts";
import type { IndexedContract } from "../../indexer/events.ts";
import { snapshot } from "./repository.ts";

// Позиция события в сети: блок, затем номер лога. Курсор ленты — «события строго раньше этой позиции».
export type EventPosition = { blockNumber: bigint; logIndex: number };

export const activityTypes = ["created", "deadline_updated", "donation", "refund", "cancelled", "withdrawn"] as const;
export type ActivityType = (typeof activityTypes)[number];

const typeOf: Record<string, ActivityType> = {
  CampaignCreated: "created",
  CampaignDeadlineUpdated: "deadline_updated",
  DonationMade: "donation",
  RefundClaimed: "refund",
  CampaignCancelled: "cancelled",
  FundsWithdrawn: "withdrawn",
};

type JournalRow = Pick<
  typeof chainEvents.$inferSelect,
  "eventName" | "args" | "blockNumber" | "blockTimestamp" | "txHash" | "logIndex"
>;

// Строка журнала → элемент ленты. Только публичные данные события: кто, сколько, какой срок и где в сети.
export function toActivityItem(row: JournalRow) {
  const type = typeOf[row.eventName];
  if (!type) throw new Error(`Unknown event ${row.eventName} in the journal`);
  const { args } = row;
  // Срок 0 у создания — сбор без срока, как в контракте.
  const deadline = type === "created" ? args.deadline : type === "deadline_updated" ? args.newDeadline : undefined;
  return {
    type,
    actor: args.donor ?? args.creator ?? null,
    amount: type === "donation" || type === "refund" || type === "withdrawn" ? BigInt(args.amount ?? "0") : null,
    deadline: deadline === undefined || deadline === "0" ? null : BigInt(deadline),
    blockNumber: row.blockNumber,
    blockTimestamp: row.blockTimestamp,
    txHash: row.txHash,
    logIndex: row.logIndex,
  };
}

const ofCampaign = (table: typeof campaigns | typeof chainEvents | typeof contributions, contract: IndexedContract, campaignId: bigint) =>
  and(
    eq(table.chainId, contract.chainId),
    eq(table.contractAddress, contract.address.toLowerCase()),
    eq(table.campaignId, campaignId),
  );

// Лента кампании от новых событий к старым. Keyset-пагинация: новое событие сверху не сдвигает следующие
// страницы, а база не перебирает пропущенные строки. null — такой кампании нет в проекции.
export async function listActivity(
  db: Database,
  contract: IndexedContract,
  campaignId: bigint,
  { limit, before }: { limit: number; before?: EventPosition },
) {
  return db.transaction(async (tx) => {
    const [exists] = await tx.select({ id: campaigns.campaignId }).from(campaigns).where(ofCampaign(campaigns, contract, campaignId));
    if (!exists) return null;

    const filters = [ofCampaign(chainEvents, contract, campaignId)];
    // Сравнение пар: (блок, лог) < (курсор) — ровно «раньше в сети», и индекс по этим колонкам его покрывает.
    if (before) filters.push(sql`(${chainEvents.blockNumber}, ${chainEvents.logIndex}) < (${before.blockNumber}, ${before.logIndex})`);
    // На одну строку больше: так видно, есть ли следующая страница, без отдельного count.
    const rows = await tx
      .select()
      .from(chainEvents)
      .where(and(...filters))
      .orderBy(desc(chainEvents.blockNumber), desc(chainEvents.logIndex))
      .limit(limit + 1);

    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return {
      items: page.map(toActivityItem),
      nextCursor: rows.length > limit && last ? { blockNumber: last.blockNumber, logIndex: last.logIndex } : null,
      finalizedBlock: await readCheckpoint(tx, contract),
    };
  }, snapshot);
}

// Донатеры кампании с текущим вкладом. Сортировка по вкладу, при равенстве — по адресу: порядок не зависит
// от плана запроса. Внесено и возвращено считаются по журналу; их разность равна текущему вкладу проекции.
export async function listDonors(
  db: Database,
  contract: IndexedContract,
  campaignId: bigint,
  { limit, offset }: { limit: number; offset: number },
) {
  return db.transaction(async (tx) => {
    const [exists] = await tx.select({ id: campaigns.campaignId }).from(campaigns).where(ofCampaign(campaigns, contract, campaignId));
    if (!exists) return null;

    const amountArg = sql`(${chainEvents.args} ->> 'amount')::numeric`;
    const history = tx
      .select({
        // Имена колонок подзапроса уникальны: Drizzle подставляет их без имени таблицы, а donor есть и в contributions.
        donor: sql<string>`${chainEvents.args} ->> 'donor'`.as("history_donor"),
        donated: sql<string>`coalesce(sum(${amountArg}) filter (where ${chainEvents.eventName} = 'DonationMade'), 0)`.as(
          "history_donated",
        ),
        refunded: sql<string>`coalesce(sum(${amountArg}) filter (where ${chainEvents.eventName} = 'RefundClaimed'), 0)`.as(
          "history_refunded",
        ),
        donations: sql<number>`(count(*) filter (where ${chainEvents.eventName} = 'DonationMade'))::int`.as(
          "history_donations",
        ),
      })
      .from(chainEvents)
      .where(and(ofCampaign(chainEvents, contract, campaignId), sql`${chainEvents.eventName} in ('DonationMade', 'RefundClaimed')`))
      .groupBy(sql`${chainEvents.args} ->> 'donor'`)
      .as("history");

    const current = and(ofCampaign(contributions, contract, campaignId), sql`${contributions.amount} > 0`);
    const rows = await tx
      .select({
        donor: contributions.donor,
        amount: contributions.amount,
        donated: history.donated,
        refunded: history.refunded,
        donations: history.donations,
      })
      .from(contributions)
      .innerJoin(history, eq(history.donor, contributions.donor))
      .where(current)
      .orderBy(desc(contributions.amount), contributions.donor)
      .limit(limit)
      .offset(offset);
    const total = await tx.$count(contributions, current);

    return {
      items: rows.map((row) => ({ ...row, donated: BigInt(row.donated), refunded: BigInt(row.refunded) })),
      total,
      finalizedBlock: await readCheckpoint(tx, contract),
    };
  }, snapshot);
}
