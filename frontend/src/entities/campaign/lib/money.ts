import { formatEther } from "viem";

const ethFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 4,
  roundingMode: "trunc",
});

// Суммы меньше 0,0001 ETH иначе превратились бы в ноль: показываем их по значащим цифрам.
const smallEthFormatter = new Intl.NumberFormat("ru-RU", {
  maximumSignificantDigits: 4,
  roundingMode: "trunc",
});

// Сумма в wei → «0,5». Строка из formatEther форматируется без перевода в number.
export function formatEthValue(wei: bigint): string {
  const formatter = wei > 0n && wei < 100_000_000_000_000n ? smallEthFormatter : ethFormatter;
  return formatter.format(formatEther(wei) as `${number}`);
}

export function formatEth(wei: bigint): string {
  return `${formatEthValue(wei)} ETH`;
}

// Процент собранного, округлённый вниз: 100 только когда цель действительно достигнута.
export function getProgressPercent(totalRaised: bigint, goal: bigint): number {
  if (goal === 0n) return 0;
  return Number((totalRaised * 100n) / goal);
}
