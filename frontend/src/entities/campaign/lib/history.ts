// Относительные пути с .ts: модуль запускается и в Next, и в node --test.
import { BackendApiError } from "../../../shared/api/backend.ts";
import type { ActivityItem, Donor } from "../api/historyApi.ts";
import { formatDeadlineDate } from "./deadline.ts";
import { formatEth } from "./money.ts";

// Что сделал участник события. Подлежащее — адрес рядом, поэтому здесь только сказуемое.
export function describeActivity({ type, amount, deadline }: ActivityItem): string {
  const sum = amount === null ? "" : formatEth(amount);
  switch (type) {
    case "created":
      return deadline === null ? "создал сбор без срока" : `создал сбор до ${formatDeadlineDate(deadline)}`;
    case "deadline_updated":
      // В V2 срок можно сдвинуть в любую сторону, но только до первого вклада: «продлил» было бы неправдой.
      return deadline === null ? "изменил срок" : `изменил срок: ${formatDeadlineDate(deadline)}`;
    case "donation":
      return `поддержал на ${sum}`;
    case "refund":
      return `вернул вклад ${sum}`;
    case "cancelled":
      return "отменил сбор";
    case "withdrawn":
      return `вывел ${sum}`;
  }
}

// Время события в часовом поясе посетителя: «16 нояб., 14:32». timeZone задают тесты.
export function formatEventTime(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone }).format(
    date,
  );
}

// Полная дата с годом и секундами для подсказки при наведении: «16 ноября 2026 г. в 14:32:12».
export function formatEventTimeFull(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "medium", timeZone }).format(date);
}

export type HistoryProblem = "not-indexed" | "unavailable";

// 404 от backend при кампании, которая есть в контракте, значит «indexer её ещё не дочитал»:
// кампания моложе finalized-блока. Всё остальное — backend недоступен или ответил не то.
export function classifyHistoryError(error: unknown): HistoryProblem {
  return error instanceof BackendApiError && error.status === 404 && error.code === "CAMPAIGN_NOT_FOUND"
    ? "not-indexed"
    : "unavailable";
}

// Первая страница донатеров короткая — топ под панелью сбора, дальше догружаем крупнее.
export const firstDonorsPage = 5;
export const nextDonorsPage = 10;

export const donorsPageLimit = (offset: number) => (offset === 0 ? firstDonorsPage : nextDonorsPage);

// Следующий offset или undefined, если загружены все. Считаем по страницам, а не по числу уникальных:
// offset — позиция в выдаче backend.
export function nextDonorsOffset(pages: readonly { items: readonly Donor[]; total: number }[]): number | undefined {
  const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
  const total = pages.at(-1)?.total ?? 0;
  return loaded < total ? loaded : undefined;
}

// Страницы донатеров в один список. Между страницами мог прийти новый вклад и сдвинуть порядок:
// тогда один адрес попадёт на две страницы, и показываем его один раз, по первой (более свежей сверху) записи.
export function mergeDonorPages(pages: readonly { items: readonly Donor[] }[]): Donor[] {
  const seen = new Set<string>();
  return pages
    .flatMap((page) => page.items)
    .filter(({ donor }) => {
      if (seen.has(donor)) return false;
      seen.add(donor);
      return true;
    });
}

// Вклад посетителя по контракту ещё не виден в истории: indexer отстаёт до finalized-блока.
// listed — вклад в загруженном списке; если адреса там нет, а список полный, значит вклада в истории нет.
export function isContributionPending({
  onChain,
  listed,
  listComplete,
}: {
  onChain: bigint | undefined;
  listed: bigint | undefined;
  listComplete: boolean;
}): boolean {
  if (onChain === undefined) return false;
  if (listed !== undefined) return listed !== onChain;
  return listComplete && onChain > 0n;
}
