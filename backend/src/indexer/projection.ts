import { and, eq, sql } from "drizzle-orm";
import type { PgUpdateSetSource } from "drizzle-orm/pg-core";

import type { Database, DatabaseTransaction } from "../db/client.ts";
import { campaigns, contributions } from "../db/schema.ts";
import type { ChainEventRow, IndexedContract } from "./events.ts";

export type ProjectedEvent = Pick<ChainEventRow, "blockNumber" | "logIndex" | "eventName" | "campaignId" | "args">;

type Executor = Database | DatabaseTransaction;
type CampaignKey = { chainId: number; contractAddress: string; campaignId: bigint };

// Порядок воспроизведения журнала: блок, затем лог внутри блока — как события шли в сети.
export function compareEvents(left: ProjectedEvent, right: ProjectedEvent) {
  if (left.blockNumber !== right.blockNumber) return left.blockNumber < right.blockNumber ? -1 : 1;
  return left.logIndex - right.logIndex;
}

// Применяет события к campaigns и contributions строго по порядку. Каждое событие должно применяться
// ровно один раз: суммы прибавляются, поэтому повтор удвоил бы их. Это обеспечивает вызывающий код.
export async function applyEvents(db: Executor, contract: IndexedContract, events: ProjectedEvent[]) {
  for (const event of events.toSorted(compareEvents)) {
    const key = { chainId: contract.chainId, contractAddress: contract.address.toLowerCase(), campaignId: event.campaignId };
    await applyEvent(db, key, event);
  }
}

async function applyEvent(db: Executor, key: CampaignKey, event: ProjectedEvent) {
  const block = event.blockNumber;
  switch (event.eventName) {
    case "CampaignCreated":
      // Повторное создание той же кампании упрётся в первичный ключ, а отсутствие метаданных — во внешний.
      await db.insert(campaigns).values({
        ...key,
        creator: arg(event, "creator"),
        goal: uintArg(event, "goal"),
        deadline: uintArg(event, "deadline"),
        totalRaised: 0n,
        cancelled: false,
        fundsWithdrawn: false,
        createdBlock: block,
        updatedBlock: block,
      });
      return;
    case "CampaignDeadlineUpdated":
      await updateCampaign(db, key, event, { deadline: uintArg(event, "newDeadline") });
      return;
    case "CampaignCancelled":
      await updateCampaign(db, key, event, { cancelled: true });
      return;
    case "FundsWithdrawn":
      await updateCampaign(db, key, event, { fundsWithdrawn: true });
      return;
    case "DonationMade": {
      const amount = uintArg(event, "amount");
      await updateCampaign(db, key, event, { totalRaised: sql`${campaigns.totalRaised} + ${amount}` });
      await db
        .insert(contributions)
        .values({ ...key, donor: arg(event, "donor"), amount, updatedBlock: block })
        .onConflictDoUpdate({
          target: [contributions.chainId, contributions.contractAddress, contributions.campaignId, contributions.donor],
          set: { amount: sql`${contributions.amount} + ${amount}`, updatedBlock: block },
        });
      return;
    }
    case "RefundClaimed": {
      // Уход суммы в минус остановит CHECK базы: журнал разошёлся бы с контрактом.
      const amount = uintArg(event, "amount");
      await updateCampaign(db, key, event, { totalRaised: sql`${campaigns.totalRaised} - ${amount}` });
      const refunded = await db
        .update(contributions)
        .set({ amount: sql`${contributions.amount} - ${amount}`, updatedBlock: block })
        .where(and(...keyConditions(contributions, key), eq(contributions.donor, arg(event, "donor"))))
        .returning({ amount: contributions.amount });
      if (refunded.length === 0) throw projectionError(event, "refund without a contribution");
      return;
    }
    default:
      throw projectionError(event, "unknown event");
  }
}

async function updateCampaign(
  db: Executor,
  key: CampaignKey,
  event: ProjectedEvent,
  changes: PgUpdateSetSource<typeof campaigns>,
) {
  const updated = await db
    .update(campaigns)
    .set({ ...changes, updatedBlock: event.blockNumber })
    .where(and(...keyConditions(campaigns, key)))
    .returning({ campaignId: campaigns.campaignId });
  if (updated.length === 0) throw projectionError(event, "campaign is not in the projection");
}

function keyConditions(table: typeof campaigns | typeof contributions, key: CampaignKey) {
  return [
    eq(table.chainId, key.chainId),
    eq(table.contractAddress, key.contractAddress),
    eq(table.campaignId, key.campaignId),
  ];
}

function arg(event: ProjectedEvent, name: string) {
  const value = event.args[name];
  if (value === undefined) throw projectionError(event, `missing argument ${name}`);
  return value;
}

const uintArg = (event: ProjectedEvent, name: string) => BigInt(arg(event, name));

function projectionError(event: ProjectedEvent, reason: string) {
  return new Error(
    `Cannot apply ${event.eventName} for campaign ${event.campaignId} at block ${event.blockNumber}: ${reason}`,
  );
}
