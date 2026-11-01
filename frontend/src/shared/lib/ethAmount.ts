import { parseEther } from "viem";

export type ParsedEthAmount = { ok: true; wei: bigint } | { ok: false; error: string };

// Сумма из поля ввода → wei. Запятая допустима; ноль, лишние знаки и мусор отклоняются до симуляции.
export function parseEthAmount(input: string): ParsedEthAmount {
  const normalized = input.trim().replace(",", ".");

  if (normalized === "") return { ok: false, error: "Введите сумму" };
  if (!/^\d+(\.\d+)?$/.test(normalized)) return { ok: false, error: "Введите число, например 0,01" };

  const fraction = normalized.split(".")[1] ?? "";
  if (fraction.length > 18) return { ok: false, error: "Не больше 18 знаков после запятой" };

  const wei = parseEther(normalized);
  if (wei === 0n) return { ok: false, error: "Сумма должна быть больше нуля" };

  return { ok: true, wei };
}
