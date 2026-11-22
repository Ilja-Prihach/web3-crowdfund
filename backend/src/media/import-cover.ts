import type { CampaignEditState } from "../chain/creator.ts";
import type { Database } from "../db/client.ts";
import type { campaignCategories } from "../db/schema.ts";
import type { IndexedContract } from "../indexer/events.ts";
import { hasDonationHistory, replaceCover, saveCategory } from "../modules/campaigns/details.ts";
import { processCover } from "./cover.ts";
import type { MediaStorage } from "./storage.ts";

export type ImportCoverDeps = {
  db: Database;
  media: MediaStorage;
  contract: IndexedContract;
  campaignEditState: (campaignId: bigint) => Promise<CampaignEditState | null>;
};

// Операторский перенос обложки и категории — тот же путь, что у загрузки создателем: пережатие, файл, строка.
// Проверки сессии нет: у оператора и так доступ к базе. В updated_by пишется создатель из контракта,
// а не выдуманный адрес: правка сделана от его имени и с его согласия.
export async function importCover(
  deps: ImportCoverDeps,
  { campaignId, file, category }: { campaignId: bigint; file: Buffer; category?: (typeof campaignCategories)[number] },
) {
  const state = await deps.campaignEditState(campaignId);
  if (state === null) throw new Error(`Campaign ${campaignId} does not exist in the contract`);
  if (state.totalRaised > 0n || (await hasDonationHistory(deps.db, deps.contract, campaignId))) {
    throw new Error(`Campaign ${campaignId} details are locked after the first donation`);
  }

  const cover = await processCover(file);
  await deps.media.put(cover.key, cover.data);
  const { row, orphanedKey } = await replaceCover(deps.db, deps.contract, campaignId, cover.key, state.creator);
  if (orphanedKey) await deps.media.delete(orphanedKey);
  if (category === undefined) return row;
  return saveCategory(deps.db, deps.contract, campaignId, category, state.creator);
}
