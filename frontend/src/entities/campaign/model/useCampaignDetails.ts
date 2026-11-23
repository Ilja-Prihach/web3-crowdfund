import { useQuery } from "@tanstack/react-query";

import { fetchCampaignDetails } from "../api/detailsApi";

export const campaignDetailsQueryKey = (id: bigint) => ["campaign-details", id.toString()] as const;

// Детали создателя из backend: обложка, категория и разделы страницы. Это дополнение, а не данные сбора:
// пока ответа нет или backend недоступен, details = undefined, и страница показывает узор без разделов.
export function useCampaignDetailsQuery(id: bigint) {
  return useQuery({
    // bigint не сериализуется в ключ запроса.
    queryKey: campaignDetailsQueryKey(id),
    queryFn: ({ signal }) => fetchCampaignDetails(id, { signal }),
    // Ошибка не показывается и не повторяется: разделы просто не появятся.
    retry: false,
    staleTime: 30_000,
  });
}

export function useCampaignDetails(id: bigint) {
  return useCampaignDetailsQuery(id).data;
}
