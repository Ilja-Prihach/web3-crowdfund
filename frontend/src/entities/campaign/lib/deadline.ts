// Относительный путь с .ts: модуль запускается и в Next, и в node --test, который не знает псевдоним @/.
import { pluralize } from "../../../shared/lib/plural.ts";

const hour = 60 * 60;
const day = 24 * hour;

// Сколько осталось до дедлайна, в секундах Unix, как хранит контракт. null — срок прошёл.
export function formatTimeLeft(deadline: bigint, nowSeconds: number): string | null {
  const secondsLeft = Number(deadline) - nowSeconds;
  if (secondsLeft <= 0) return null;

  if (secondsLeft >= day) {
    const days = Math.floor(secondsLeft / day);
    return `${days} ${pluralize(days, ["день", "дня", "дней"])}`;
  }

  if (secondsLeft >= hour) return `${Math.floor(secondsLeft / hour)} ч`;
  return "< 1 ч";
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// Дедлайн контракта в секундах Unix → «18 декабря 2026». Дата по UTC, как её видит блокчейн.
export function formatDeadlineDate(deadline: bigint): string {
  return dateFormatter.format(new Date(Number(deadline) * 1000)).replace(" г.", "");
}
