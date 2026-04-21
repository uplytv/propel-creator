export type FilterGroup = "all" | "kpi" | "onboarding";
export type SortKey = "newest" | "oldest" | "label";

export const VALID_FILTERS: FilterGroup[] = ["all", "kpi", "onboarding"];
export const VALID_SORTS: SortKey[] = ["newest", "oldest", "label"];
export const VALID_PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export function parseFilter(raw: string | null | undefined): FilterGroup {
  return VALID_FILTERS.includes(raw as FilterGroup) ? (raw as FilterGroup) : "all";
}

export function parseSort(raw: string | null | undefined): SortKey {
  return VALID_SORTS.includes(raw as SortKey) ? (raw as SortKey) : "newest";
}

export function parseQuery(raw: string | null | undefined): string {
  return (raw ?? "").slice(0, 100);
}

export function parsePageSize(raw: string | null | undefined): number {
  const n = Number(raw);
  return VALID_PAGE_SIZES.includes(n as (typeof VALID_PAGE_SIZES)[number])
    ? n
    : DEFAULT_PAGE_SIZE;
}

export function parsePage(
  raw: string | null | undefined,
  totalItems: number,
  pageSize: number
): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return 1;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return Math.min(n, totalPages);
}
