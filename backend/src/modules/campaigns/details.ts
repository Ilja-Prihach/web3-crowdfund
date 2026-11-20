import { and, eq } from "drizzle-orm";

import type { Database } from "../../db/client.ts";
import { campaignDetails } from "../../db/schema.ts";
import type { IndexedContract } from "../../indexer/events.ts";

export type CampaignDetailsRow = typeof campaignDetails.$inferSelect;
// Тексты и категория, которые создатель сохраняет одной формой; обложка меняется отдельно.
export type DetailsFields = Pick<CampaignDetailsRow, "category" | "story" | "budget" | "plan" | "risks">;

// Адрес файла от корня API: ключ covers/<sha256>.webp отдаёт маршрут /v1/media/covers/:file.
export const coverUrl = (coverKey: string | null) => (coverKey === null ? null : `/v1/media/${coverKey}`);

const keyOf = (contract: IndexedContract, campaignId: bigint) => ({
  chainId: contract.chainId,
  contractAddress: contract.address.toLowerCase(),
  campaignId,
});

const whereKey = (contract: IndexedContract, campaignId: bigint) =>
  and(
    eq(campaignDetails.chainId, contract.chainId),
    eq(campaignDetails.contractAddress, contract.address.toLowerCase()),
    eq(campaignDetails.campaignId, campaignId),
  );

export async function findDetails(db: Database, contract: IndexedContract, campaignId: bigint) {
  const [row] = await db.select().from(campaignDetails).where(whereKey(contract, campaignId));
  return row;
}

// Заменяет тексты и категорию целиком; обложку не трогает. Первая запись создаёт строку.
export async function saveDetails(
  db: Database,
  contract: IndexedContract,
  campaignId: bigint,
  fields: DetailsFields,
  updatedBy: string,
) {
  const changes = { ...fields, updatedBy: updatedBy.toLowerCase(), updatedAt: new Date() };
  const [row] = await db
    .insert(campaignDetails)
    .values({ ...keyOf(contract, campaignId), ...changes })
    .onConflictDoUpdate({ target: [campaignDetails.chainId, campaignDetails.contractAddress, campaignDetails.campaignId], set: changes })
    .returning();
  if (!row) throw new Error(`campaign_details ${campaignId} was not saved`);
  return row;
}

// Ставит или убирает обложку. Возвращает новую строку и ключ прежнего файла, если на него больше никто не ссылается:
// одинаковая картинка у двух кампаний — один файл, и удалять его можно, только когда он не нужен никому.
// Файл удаляет вызывающий после фиксации: сбой удаления оставит лишний файл, а не битую ссылку.
export async function replaceCover(
  db: Database,
  contract: IndexedContract,
  campaignId: bigint,
  coverKey: string | null,
  updatedBy: string,
) {
  return db.transaction(async (tx) => {
    // FOR UPDATE: две одновременные замены одной обложки не прочитают один и тот же прежний ключ.
    const [current] = await tx
      .select({ coverKey: campaignDetails.coverKey })
      .from(campaignDetails)
      .where(whereKey(contract, campaignId))
      .for("update");

    const changes = { coverKey, updatedBy: updatedBy.toLowerCase(), updatedAt: new Date() };
    const [row] = await tx
      .insert(campaignDetails)
      .values({ ...keyOf(contract, campaignId), ...changes })
      .onConflictDoUpdate({ target: [campaignDetails.chainId, campaignDetails.contractAddress, campaignDetails.campaignId], set: changes })
      .returning();
    if (!row) throw new Error(`campaign_details ${campaignId} was not saved`);

    const previous = current?.coverKey ?? null;
    if (previous === null || previous === coverKey) return { row, orphanedKey: null };
    const stillUsed = await tx.$count(campaignDetails, eq(campaignDetails.coverKey, previous));
    return { row, orphanedKey: stillUsed === 0 ? previous : null };
  });
}

// Меняет только категорию, не трогая тексты и обложку. Первая запись создаёт строку.
export async function saveCategory(
  db: Database,
  contract: IndexedContract,
  campaignId: bigint,
  category: CampaignDetailsRow["category"],
  updatedBy: string,
) {
  const changes = { category, updatedBy: updatedBy.toLowerCase(), updatedAt: new Date() };
  const [row] = await db
    .insert(campaignDetails)
    .values({ ...keyOf(contract, campaignId), ...changes })
    .onConflictDoUpdate({ target: [campaignDetails.chainId, campaignDetails.contractAddress, campaignDetails.campaignId], set: changes })
    .returning();
  if (!row) throw new Error(`campaign_details ${campaignId} was not saved`);
  return row;
}
