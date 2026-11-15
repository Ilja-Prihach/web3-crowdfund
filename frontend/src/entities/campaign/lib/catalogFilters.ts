import type { CatalogParams, CatalogSort } from "../api/catalogApi.ts";
import type { Campaign, CampaignStatus, FundingMode } from "../model/campaign.ts";

export type StatusFilter = "all" | "active" | "finished";
export type ModeFilter = "all" | FundingMode;
export type CatalogFilters = { query: string; status: StatusFilter; mode: ModeFilter; sort: CatalogSort };

export const defaultCatalogFilters: CatalogFilters = { query: "", status: "all", mode: "all", sort: "newest" };

// «Завершены» — всё, что уже не принимает вклады.
const finishedStatuses: readonly CampaignStatus[] = ["successful", "failed", "withdrawn", "cancelled"];

export function toCatalogParams(filters: CatalogFilters, page: number, pageSize: number): CatalogParams {
  return {
    query: filters.query,
    statuses: filters.status === "all" ? undefined : filters.status === "active" ? ["active"] : finishedStatuses,
    mode: filters.mode === "all" ? undefined : filters.mode,
    sort: filters.sort,
    page,
    pageSize,
  };
}

// Фильтр загруженной страницы — только для чтения из контракта, где backend-фильтров нет.
export function matchesFilters(campaign: Campaign, filters: CatalogFilters) {
  const statusMatches =
    filters.status === "all" || (filters.status === "active" ? campaign.status === "active" : campaign.status !== "active");
  return statusMatches && (filters.mode === "all" || campaign.fundingMode === filters.mode);
}

export type CatalogSource = "pending" | "backend" | "contract";

type BackendState =
  | { status: "pending" }
  | { status: "error" }
  | { status: "success"; finalizedBlock: bigint | null };

// Откуда каталог берёт данные. Ошибка, таймаут или ещё не запускавшийся indexer (finalizedBlock = null) —
// откат на контракт: пустой каталог backend при живых кампаниях в контракте был бы неправдой.
export function chooseCatalogSource(backend: BackendState): CatalogSource {
  if (backend.status === "pending") return "pending";
  if (backend.status === "error" || backend.finalizedBlock === null) return "contract";
  return "backend";
}
