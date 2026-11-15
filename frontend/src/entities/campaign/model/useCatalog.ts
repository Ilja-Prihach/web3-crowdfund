import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchCatalog } from "../api/catalogApi";
import { type CatalogFilters, chooseCatalogSource, matchesFilters, toCatalogParams } from "../lib/catalogFilters";
import { campaignsPageSize, getPageCount } from "../lib/pagination";
import { useCampaignCatalog } from "./useCampaignCatalog";

const pageSize = Number(campaignsPageSize);

// Каталог для виджета: backend с поиском и фильтрами по всем кампаниям, а если он недоступен —
// чтение контракта, как во Frontend MVP. Виджет получает одну форму данных из любого источника.
export function useCatalog(filters: CatalogFilters, page: number) {
  const params = toCatalogParams(filters, page, pageSize);
  const backend = useQuery({
    queryKey: ["catalog", params],
    queryFn: ({ signal }) => fetchCatalog(params, signal),
    // При наборе текста и смене страницы остаётся прошлый список, а не скелетон.
    placeholderData: keepPreviousData,
    // Ошибка — сразу откат на контракт, а не три повтора по несколько секунд.
    retry: false,
    staleTime: 30_000,
  });

  const source = chooseCatalogSource(
    backend.status === "success" ? { status: "success", finalizedBlock: backend.data.finalizedBlock } : { status: backend.status },
  );
  // У контракта нет сортировки по сумме: при откате остаётся порядок по id.
  const contractOrder = filters.sort === "oldest" ? "oldest" : "newest";
  const contract = useCampaignCatalog(page, contractOrder, source === "contract");

  if (source === "backend" && backend.data) {
    return {
      source,
      campaigns: backend.data.campaigns,
      total: backend.data.total,
      pageCount: Math.ceil(backend.data.total / pageSize),
      finalizedBlock: backend.data.finalizedBlock,
      isPending: false,
      // Идёт запрос по новым фильтрам, а на экране ещё прошлый результат.
      isUpdating: backend.isPlaceholderData,
      isError: false,
      retry: () => backend.refetch(),
      retryBackend: () => backend.refetch(),
    };
  }

  return {
    source,
    // Без backend фильтры видят только загруженную страницу контракта.
    campaigns: contract.campaigns.filter((campaign) => matchesFilters(campaign, filters)),
    total: contract.total === undefined ? undefined : Number(contract.total),
    pageCount: contract.total === undefined ? 0 : getPageCount(contract.total),
    finalizedBlock: null,
    isPending: source === "pending" || contract.isPending,
    isUpdating: false,
    isError: contract.isError,
    retry: contract.retry,
    // Попробовать backend снова: например, после того как его перезапустили.
    retryBackend: () => backend.refetch(),
  };
}
