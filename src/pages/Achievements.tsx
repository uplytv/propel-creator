import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Sparkles, Search, X, RotateCcw, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import {
  parseFilter,
  parseSort,
  parseQuery,
  parsePageSize,
  parseCursor,
  sliceByCursor,
  VALID_PAGE_SIZES,
  DEFAULT_PAGE_SIZE,
  type FilterGroup,
  type SortKey,
} from "./achievements/filters";

interface Milestone {
  id: string;
  milestone_key: string;
  label: string;
  emoji: string;
  group_type: string;
  reached_at: string;
}

export default function Achievements() {
  const { user } = useAuth();
  const [items, setItems] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_milestones")
        .select("*")
        .eq("user_id", user.id)
        .order("reached_at", { ascending: false });
      setItems((data as Milestone[]) || []);
      setLoading(false);
    })();
  }, [user?.id]);

  const [searchParams, setSearchParams] = useSearchParams();
  const query = parseQuery(searchParams.get("q"));
  const filter = parseFilter(searchParams.get("group"));
  const sort = parseSort(searchParams.get("sort"));

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (!v) next.delete(k);
      else next.set(k, v);
    });
    setSearchParams(next, { replace: true });
  };

  const setQuery = (v: string) => updateParams({ q: v || null, cursor: null });
  const setFilter = (v: FilterGroup) => updateParams({ group: v === "all" ? null : v, cursor: null });
  const setSort = (v: SortKey) => updateParams({ sort: v === "newest" ? null : v, cursor: null });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = items.filter((i) => {
      if (filter !== "all" && i.group_type !== filter) return false;
      if (!q) return true;
      return (
        i.label.toLowerCase().includes(q) ||
        i.milestone_key.toLowerCase().includes(q) ||
        (i.emoji || "").includes(q)
      );
    });
    const sorted = [...result];
    if (sort === "newest") {
      sorted.sort((a, b) => +new Date(b.reached_at) - +new Date(a.reached_at));
    } else if (sort === "oldest") {
      sorted.sort((a, b) => +new Date(a.reached_at) - +new Date(b.reached_at));
    } else {
      sorted.sort((a, b) => a.label.localeCompare(b.label));
    }
    return sorted;
  }, [items, query, filter, sort]);

  const pageSize = parsePageSize(searchParams.get("pageSize"));
  const cursor = parseCursor(searchParams.get("cursor"));
  const {
    items: pageItems,
    startIndex,
    nextCursor,
    prevCursor,
  } = useMemo(
    () => sliceByCursor(filtered, cursor, pageSize),
    [filtered, cursor, pageSize]
  );

  const setCursor = (c: string | null) => updateParams({ cursor: c });
  const setPageSize = (n: number) =>
    updateParams({
      pageSize: n === DEFAULT_PAGE_SIZE ? null : String(n),
      cursor: null,
    });

  const counts = {
    all: items.length,
    kpi: items.filter((i) => i.group_type === "kpi").length,
    onboarding: items.filter((i) => i.group_type === "onboarding").length,
  };

  const groupLabel = (g: string) => (g === "kpi" ? "Growth Plan" : "Onboarding");
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 mobile-safe-content">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Achievements</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          A history of milestones you've unlocked on your journey.
        </p>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No milestones yet</h3>
            <p className="text-sm text-muted-foreground">
              Keep building — your first milestone is coming.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search milestones..."
                  className="pl-9 pr-9 bg-card border-border"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted text-muted-foreground"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: "all" as const, label: "All" },
                  { key: "kpi" as const, label: "Growth Plan" },
                  { key: "onboarding" as const, label: "Onboarding" },
                ]).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setFilter(opt.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                      filter === opt.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {opt.label}
                    <span className="ml-1.5 opacity-70">({counts[opt.key]})</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Sort:</span>
                {([
                  { key: "newest" as const, label: "Newest" },
                  { key: "oldest" as const, label: "Oldest" },
                  { key: "label" as const, label: "Label A–Z" },
                ]).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSort(opt.key)}
                    className={cn(
                      "px-2.5 py-1 rounded-md font-medium border transition-colors",
                      sort === opt.key
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
                {(query || filter !== "all" || sort !== "newest" || cursor || pageSize !== DEFAULT_PAGE_SIZE) && (
                  <button
                    onClick={() => {
                      updateParams({ q: null, group: null, sort: null, cursor: null, pageSize: null });
                    }}
                    className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No matches</h3>
                <p className="text-sm text-muted-foreground">
                  Try a different keyword or filter.
                </p>
              </div>
            ) : (
              <>
                <ul className="space-y-2">
                  {pageItems.map((m, i) => (
                    <motion.li
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4"
                    >
                      <div className="text-3xl">{m.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{m.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {groupLabel(m.group_type)} · Unlocked{" "}
                          {format(new Date(m.reached_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      <Trophy className="w-4 h-4 text-primary shrink-0" />
                    </motion.li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>Per page:</span>
                    {VALID_PAGE_SIZES.map((n) => (
                      <button
                        key={n}
                        onClick={() => setPageSize(n)}
                        className={cn(
                          "px-2 py-1 rounded-md border transition-colors",
                          pageSize === n
                            ? "bg-primary/15 border-primary/40 text-primary"
                            : "bg-card border-border hover:text-foreground"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      {filtered.length === 0
                        ? "0 results"
                        : `${startIndex + 1}–${startIndex + pageItems.length} of ${filtered.length}`}
                      {filtered.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label="About this range"
                              className="text-muted-foreground/70 hover:text-foreground transition-colors"
                            >
                              <Info className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px] text-xs">
                            This page uses a stable cursor — newly unlocked
                            achievements appear at the top without shifting
                            your current view.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                    <button
                      onClick={() => setCursor(prevCursor)}
                      disabled={prevCursor === null && startIndex === 0}
                      className="p-1.5 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCursor(nextCursor)}
                      disabled={nextCursor === null}
                      className="p-1.5 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Next page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
