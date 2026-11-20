import { useQuery } from "@tanstack/react-query";

import { fetchCampaignDetails } from "../api/detailsApi";

// Детали создателя из backend: обложка, категория и разделы страницы. Это дополнение, а не данные сбора:
// пока ответа нет или backend недоступен, details = undefined, и страница показывает узор без разделов.
export function useCampaignDetails(id: bigint) {
  const query = useQuery({
    // bigint не сериализуется в ключ запроса.
    queryKey: ["campaign-details", id.toString()],
    queryFn: ({ signal }) => fetchCampaignDetails(id, { signal }),
    // Ошибка не показывается и не повторяется: разделы просто не появятся.
    retry: false,
    staleTime: 30_000,
  });
  return query.data;
}
