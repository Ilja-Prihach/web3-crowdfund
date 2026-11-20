import { getAddress, isAddress } from "viem";

import { BackendApiError, parseFinalizedBlock, requestBackend } from "../../../shared/api/backend.ts";
import {
  type Campaign,
  type CampaignCategory,
  type CampaignStatus,
  campaignStatuses,
  type FundingMode,
} from "../model/campaign.ts";
import { parseCategory, parseCoverUrl } from "./detailsApi.ts";

export type CatalogSort = "newest" | "oldest" | "raised";

export type CatalogParams = {
  query?: string;
  statuses?: readonly CampaignStatus[];
  mode?: FundingMode;
  category?: CampaignCategory;
  sort: CatalogSort;
  page: number;
  pageSize: number;
};

// Ответ backend: uint256 приходят десятичными строками, у сбора без срока deadline — null.
type CampaignJson = {
  id: string;
  creator: string;
  fundingMode: "fixed_deadline" | "open_ended";
  title: string;
  description: string;
  goal: string;
  deadline: string | null;
  totalRaised: string;
  status: string;
  createdBlock: string;
  // Участники: адреса с текущим вкладом больше нуля.
  donors: number;
  // Из деталей создателя (#49); null — не заполнено.
  category: string | null;
  coverUrl: string | null;
};
type CatalogJson = { items: CampaignJson[]; total: number; finalizedBlock: string | null };

const apiModes: Record<FundingMode, CampaignJson["fundingMode"]> = {
  fixedDeadline: "fixed_deadline",
  openEnded: "open_ended",
};

// Параметры запроса: пустой поиск не отправляется, статусы — повторяемым параметром.
export function catalogSearchParams({ query, statuses, mode, category, sort, page, pageSize }: CatalogParams) {
  const params = new URLSearchParams();
  const search = query?.trim();
  if (search) params.set("q", search);
  for (const status of statuses ?? []) params.append("status", status);
  if (mode) params.set("mode", apiModes[mode]);
  if (category) params.set("category", category);
  params.set("sort", sort);
  params.set("limit", String(pageSize));
  params.set("offset", String(page * pageSize));
  return params;
}

// JSON backend → та же Campaign, что из контракта: карточкам всё равно, откуда пришли данные.
// Незнакомое значение — ошибка ответа, а не тихо неверная карточка.
export function fromCampaignJson(json: CampaignJson): Campaign {
  const status = campaignStatuses.find((known) => known === json.status);
  if (!status) throw new BackendApiError(200, "INVALID_RESPONSE", { cause: `status ${json.status}` });
  if (!isAddress(json.creator, { strict: false })) {
    throw new BackendApiError(200, "INVALID_RESPONSE", { cause: `creator ${json.creator}` });
  }
  if (json.fundingMode !== "fixed_deadline" && json.fundingMode !== "open_ended") {
    throw new BackendApiError(200, "INVALID_RESPONSE", { cause: `funding mode ${String(json.fundingMode)}` });
  }
  return {
    id: BigInt(json.id),
    // Backend хранит адреса строчными, контракт отдаёт с контрольной суммой EIP-55: карточки показывают одинаково.
    creator: getAddress(json.creator),
    title: json.title,
    description: json.description,
    goal: BigInt(json.goal),
    // В контракте у сбора без срока deadline = 0.
    deadline: json.deadline === null ? 0n : BigInt(json.deadline),
    totalRaised: BigInt(json.totalRaised),
    fundingMode: json.fundingMode === "open_ended" ? "openEnded" : "fixedDeadline",
    status,
    donors: json.donors,
    category: parseCategory(json.category),
    coverUrl: parseCoverUrl(json.coverUrl),
  };
}

export async function fetchCatalog(params: CatalogParams, signal?: AbortSignal, timeoutMs?: number) {
  const body = (await requestBackend(`/campaigns?${catalogSearchParams(params).toString()}`, { signal, timeoutMs })) as CatalogJson;
  if (!Array.isArray(body.items)) throw new BackendApiError(200, "INVALID_RESPONSE");

  return {
    campaigns: body.items.map(fromCampaignJson),
    total: body.total,
    finalizedBlock: parseFinalizedBlock(body.finalizedBlock),
  };
}
