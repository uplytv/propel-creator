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

/**
 * Validates a cursor string. A cursor is the stable id of the first item on
 * the current page. Invalid (non-string, too long, missing) cursors are
 * treated as null which means "start from the beginning".
 */
export function parseCursor(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 64) return null;
  // Allow uuid-ish ids (alphanumeric, dashes, underscores)
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Resolves a cursor to a slice of items. The cursor points to the first item
 * of the current page. If the cursor is missing or no longer present in the
 * sorted list, falls back to the start.
 */
export function sliceByCursor<T extends { id: string }>(
  sorted: T[],
  cursor: string | null,
  pageSize: number
): { items: T[]; startIndex: number; nextCursor: string | null; prevCursor: string | null } {
  let startIndex = 0;
  if (cursor) {
    const idx = sorted.findIndex((i) => i.id === cursor);
    if (idx >= 0) startIndex = idx;
  }
  const items = sorted.slice(startIndex, startIndex + pageSize);
  const nextStart = startIndex + pageSize;
  const nextCursor = nextStart < sorted.length ? sorted[nextStart].id : null;
  const prevStart = Math.max(0, startIndex - pageSize);
  const prevCursor = startIndex === 0 ? null : sorted[prevStart]?.id ?? null;
  return { items, startIndex, nextCursor, prevCursor };
}
