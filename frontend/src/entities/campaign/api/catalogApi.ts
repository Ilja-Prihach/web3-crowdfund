import type { Address } from "viem";

import { type Campaign, type CampaignStatus, campaignStatuses, type FundingMode } from "../model/campaign.ts";

// Относительный путь: backend на том же источнике, CORS не нужен.
const catalogBase = "/api/v1/campaigns";
// Сколько ждать backend, прежде чем перейти на чтение контракта.
export const catalogTimeoutMs = 5_000;

export type CatalogSort = "newest" | "oldest" | "raised";

export type CatalogParams = {
  query?: string;
  statuses?: readonly CampaignStatus[];
  mode?: FundingMode;
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
};
type CatalogJson = { items: CampaignJson[]; total: number; finalizedBlock: string | null };

// Ошибка каталога: status 0 — сеть, таймаут или отмена; code — машинный код backend или собственный.
export class CatalogApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, options?: ErrorOptions) {
    super(`Catalog API ${status} ${code}`, options);
    this.name = "CatalogApiError";
    this.status = status;
    this.code = code;
  }
}

const apiModes: Record<FundingMode, CampaignJson["fundingMode"]> = {
  fixedDeadline: "fixed_deadline",
  openEnded: "open_ended",
};

// Параметры запроса: пустой поиск не отправляется, статусы — повторяемым параметром.
export function catalogSearchParams({ query, statuses, mode, sort, page, pageSize }: CatalogParams) {
  const params = new URLSearchParams();
  const search = query?.trim();
  if (search) params.set("q", search);
  for (const status of statuses ?? []) params.append("status", status);
  if (mode) params.set("mode", apiModes[mode]);
  params.set("sort", sort);
  params.set("limit", String(pageSize));
  params.set("offset", String(page * pageSize));
  return params;
}

// JSON backend → та же Campaign, что из контракта: карточкам всё равно, откуда пришли данные.
// Незнакомое значение — ошибка ответа, а не тихо неверная карточка.
export function fromCampaignJson(json: CampaignJson): Campaign {
  const status = campaignStatuses.find((known) => known === json.status);
  if (!status) throw new CatalogApiError(200, "INVALID_RESPONSE", { cause: `status ${json.status}` });
  if (json.fundingMode !== "fixed_deadline" && json.fundingMode !== "open_ended") {
    throw new CatalogApiError(200, "INVALID_RESPONSE", { cause: `funding mode ${String(json.fundingMode)}` });
  }
  return {
    id: BigInt(json.id),
    creator: json.creator as Address,
    title: json.title,
    description: json.description,
    goal: BigInt(json.goal),
    // В контракте у сбора без срока deadline = 0.
    deadline: json.deadline === null ? 0n : BigInt(json.deadline),
    totalRaised: BigInt(json.totalRaised),
    fundingMode: json.fundingMode === "open_ended" ? "openEnded" : "fixedDeadline",
    status,
  };
}

export async function fetchCatalog(params: CatalogParams, signal?: AbortSignal, timeoutMs = catalogTimeoutMs) {
  // Запрос обрывается и по отмене TanStack Query (ушли со страницы, сменили фильтр), и по таймауту.
  const timeout = AbortSignal.timeout(timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${catalogBase}?${catalogSearchParams(params).toString()}`, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (cause) {
    const code = timeout.aborted ? "TIMEOUT" : signal?.aborted ? "ABORTED" : "NETWORK_ERROR";
    throw new CatalogApiError(0, code, { cause });
  }

  const body = (await response.json().catch(() => null)) as (CatalogJson & { error?: { code?: string } }) | null;
  if (!response.ok) throw new CatalogApiError(response.status, body?.error?.code ?? "UNKNOWN_ERROR");
  if (!body || !Array.isArray(body.items)) throw new CatalogApiError(response.status, "INVALID_RESPONSE");

  return {
    campaigns: body.items.map(fromCampaignJson),
    total: body.total,
    // Последний finalized-блок, до которого indexer применил события; null — indexer ещё не запускался.
    finalizedBlock: body.finalizedBlock === null ? null : BigInt(body.finalizedBlock),
  };
}
