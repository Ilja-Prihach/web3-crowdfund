import type { ChainClient } from "../chain/client.ts";
import { crowdfunding } from "../chain/contract.ts";
import { type campaignMetadata, fundingModes } from "../db/schema.ts";
import type { IndexedContract } from "./events.ts";

export type CampaignMetadataRow = typeof campaignMetadata.$inferInsert;

// MAX_PAGE_SIZE контракта: getCampaigns отдаёт не больше 20 кампаний за вызов.
const pageSize = 20n;

// Читает название, описание и режим сбора через getCampaigns на заданном блоке. В V2 эти поля неизменяемы,
// а блок пачки делает чтение воспроизводимым: на нём кампании из пачки уже точно существуют.
export async function readCampaignMetadata(
  chain: ChainClient,
  contract: IndexedContract,
  campaignIds: bigint[],
  blockNumber: bigint,
): Promise<CampaignMetadataRow[]> {
  const rows: CampaignMetadataRow[] = [];
  for (const [offset, limit] of pages(campaignIds)) {
    const page = await chain.readContract({
      address: contract.address,
      abi: crowdfunding.abi,
      functionName: "getCampaigns",
      args: [offset, limit],
      blockNumber,
    });
    // Кампании с id за nextCampaignId контракт молча не возвращает — это ошибка, а не пустые метаданные.
    if (BigInt(page.length) !== limit) {
      throw new Error(`Campaigns ${offset}..${offset + limit - 1n} do not exist at block ${blockNumber}`);
    }
    for (const { id, campaign } of page) {
      const fundingMode = fundingModes[campaign.fundingMode];
      if (fundingMode === undefined) throw new Error(`Unknown funding mode ${campaign.fundingMode} of campaign ${id}`);
      rows.push({
        chainId: contract.chainId,
        contractAddress: contract.address.toLowerCase(),
        campaignId: id,
        fundingMode,
        title: campaign.title,
        description: campaign.description,
      });
    }
  }
  return rows;
}

// Разбивает id на страницы [offset, limit]: подряд идущие id — одним вызовом, не больше pageSize.
// Новые кампании в пачке почти всегда идут подряд, поэтому вызовов столько же, сколько страниц.
function pages(campaignIds: bigint[]) {
  const sorted = [...new Set(campaignIds)].toSorted((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  const result: [bigint, bigint][] = [];
  for (const id of sorted) {
    const last = result.at(-1);
    if (last && last[0] + last[1] === id && last[1] < pageSize) last[1] += 1n;
    else result.push([id, 1n]);
  }
  return result;
}
