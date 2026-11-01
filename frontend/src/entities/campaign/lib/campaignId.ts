const maxUint256 = 2n ** 256n - 1n;

// ID из URL: только десятичные цифры без ведущих нулей и не больше uint256. null — адрес неверный.
export function parseCampaignId(value: string): bigint | null {
  if (!/^(0|[1-9]\d*)$/.test(value)) return null;

  const id = BigInt(value);
  return id <= maxUint256 ? id : null;
}
