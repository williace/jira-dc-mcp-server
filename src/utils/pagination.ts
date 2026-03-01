export interface PaginationMeta {
  startAt: number;
  maxResults: number;
  total: number;
  isLastPage: boolean;
  nextStartAt: number | null;
}

export function buildPaginationMeta(startAt: number, maxResults: number, total: number): PaginationMeta {
  const isLastPage = startAt + maxResults >= total;
  return {
    startAt,
    maxResults,
    total,
    isLastPage,
    nextStartAt: isLastPage ? null : startAt + maxResults,
  };
}

export function formatPaginationFooter(meta: PaginationMeta): string {
  const end = Math.min(meta.startAt + meta.maxResults, meta.total);
  if (meta.isLastPage) {
    return `Showing ${meta.startAt + 1}-${end} of ${meta.total} results. (Last page)`;
  }
  return `Showing ${meta.startAt + 1}-${end} of ${meta.total} results. Next page: startAt=${meta.nextStartAt}`;
}
