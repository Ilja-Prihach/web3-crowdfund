import { formatEther } from "viem";

const ethFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 4,
  roundingMode: "trunc",
});

// Сумма в wei → «0,5 ETH». Строка из formatEther форматируется без перевода в number.
export function formatEth(wei: bigint): string {
  if (wei > 0n && wei < 100_000_000_000_000n) return "< 0,0001 ETH";
  return `${ethFormatter.format(formatEther(wei) as `${number}`)} ETH`;
}

// Процент собранного, округлённый вниз: 100 только когда цель действительно достигнута.
export function getProgressPercent(totalRaised: bigint, goal: bigint): number {
  if (goal === 0n) return 0;
  return Number((totalRaised * 100n) / goal);
}
