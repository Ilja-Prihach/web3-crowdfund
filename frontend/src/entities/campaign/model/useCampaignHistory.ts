import { useInfiniteQuery } from "@tanstack/react-query";

import { fetchActivity, fetchDonors } from "../api/historyApi";
import { classifyHistoryError, donorsPageLimit, mergeDonorPages, nextDonorsOffset } from "../lib/history";

// Сколько событий ленты на страницу «Показать ещё».
export const activityPageSize = 10;

// Общие настройки истории: ошибка backend — сразу сообщение, а не три повтора; данные отстают до
// finalized-блока, поэтому перезапрашивать чаще раза в 30 секунд бессмысленно.
const historyQuery = { retry: false, staleTime: 30_000 } as const;

// Лента кампании от новых событий к старым. Следующая страница — по nextCursor прошлой.
export function useCampaignActivity(id: bigint) {
  const query = useInfiniteQuery({
    // bigint в ключе нельзя: TanStack Query сериализует ключ через JSON.
    queryKey: ["campaign-activity", id.toString()],
    queryFn: ({ pageParam, signal }) => fetchActivity(id, { limit: activityPageSize, before: pageParam }, { signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    ...historyQuery,
  });

  return {
    items: query.data?.pages.flatMap((page) => page.items) ?? [],
    // Блок первой страницы: верх ленты показывает самые свежие события.
    finalizedBlock: query.data?.pages[0]?.finalizedBlock ?? null,
    isPending: query.isPending,
    problem: query.isError ? classifyHistoryError(query.error) : null,
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    // Ошибка догрузки не стирает уже показанные события.
    loadMoreFailed: query.isFetchNextPageError,
    loadMore: () => query.fetchNextPage(),
    retry: () => query.refetch(),
  };
}

// Текущие донатеры по убыванию вклада: сначала топ, затем страницы крупнее.
export function useCampaignDonors(id: bigint) {
  const query = useInfiniteQuery({
    queryKey: ["campaign-donors", id.toString()],
    queryFn: ({ pageParam, signal }) => fetchDonors(id, { limit: donorsPageLimit(pageParam), offset: pageParam }, { signal }),
    initialPageParam: 0,
    getNextPageParam: (_last, pages) => nextDonorsOffset(pages),
    ...historyQuery,
  });
  const pages = query.data?.pages ?? [];

  return {
    donors: mergeDonorPages(pages),
    // Число участников — по первой странице: её total согласован с топом, который видно сразу.
    total: pages[0]?.total,
    finalizedBlock: pages[0]?.finalizedBlock ?? null,
    isPending: query.isPending,
    problem: query.isError ? classifyHistoryError(query.error) : null,
    hasMore: query.hasNextPage,
    // Все донатеры загружены: отсутствие адреса в списке значит, что вклада в истории нет.
    isComplete: query.isSuccess && !query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMoreFailed: query.isFetchNextPageError,
    loadMore: () => query.fetchNextPage(),
    retry: () => query.refetch(),
  };
}
