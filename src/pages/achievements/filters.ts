export type FilterGroup = "all" | "kpi" | "onboarding";
export type SortKey = "newest" | "oldest" | "label";

export const VALID_FILTERS: FilterGroup[] = ["all", "kpi", "onboarding"];
export const VALID_SORTS: SortKey[] = ["newest", "oldest", "label"];

export function parseFilter(raw: string | null | undefined): FilterGroup {
  return VALID_FILTERS.includes(raw as FilterGroup) ? (raw as FilterGroup) : "all";
}

export function parseSort(raw: string | null | undefined): SortKey {
  return VALID_SORTS.includes(raw as SortKey) ? (raw as SortKey) : "newest";
}

export function parseQuery(raw: string | null | undefined): string {
  return (raw ?? "").slice(0, 100);
}
