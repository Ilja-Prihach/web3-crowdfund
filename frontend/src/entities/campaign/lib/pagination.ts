// Совпадает с MAX_PAGE_SIZE в Crowdfunding.sol: больше контракт за один вызов не отдаёт.
export const campaignsPageSize = 20n;

export type CatalogOrder = "newest" | "oldest";

// getCampaigns читает по возрастанию ID, поэтому для «новых» окно отсчитывается с конца.
// null — такой страницы нет. Размер страницы одинаков для обоих направлений.
export function getPageWindow(
  total: bigint,
  page: number,
  order: CatalogOrder,
  pageSize = campaignsPageSize,
) {
  const skipped = BigInt(page) * pageSize;
  if (skipped >= total) return null;

  const remaining = total - skipped;
  const limit = remaining < pageSize ? remaining : pageSize;
  const offset = order === "oldest" ? skipped : remaining - limit;
  return { offset, limit };
}

export function getPageCount(total: bigint, pageSize = campaignsPageSize): number {
  return Number((total + pageSize - 1n) / pageSize);
}
