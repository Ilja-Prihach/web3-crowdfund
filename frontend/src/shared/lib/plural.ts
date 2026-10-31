// Русское склонение по числу: [«сбор», «сбора», «сборов»] для 1, 2–4 и 5+.
export function pluralize(count: number, forms: readonly [string, string, string]) {
  const lastTwo = Math.abs(count) % 100;
  const last = lastTwo % 10;

  if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}
