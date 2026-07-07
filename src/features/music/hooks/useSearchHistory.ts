import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase;

export interface SearchHistoryRow {
  id: string;
  query: string;
  created_at: string;
}

export function useSearchHistory(limit = 10) {
  const { user } = useAuth();
  return useQuery<SearchHistoryRow[]>({
    queryKey: ["music-search-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await sb
        .from("music_search_history")
        .select("id, query, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit * 3);
      // dedupe by query (keep most recent)
      const seen = new Set<string>();
      const out: SearchHistoryRow[] = [];
      for (const row of (data as SearchHistoryRow[]) ?? []) {
        const key = row.query.toLowerCase().trim();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(row);
        if (out.length >= limit) break;
      }
      return out;
    },
  });
}

export function useRecordSearch() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (query: string) => {
      const q = query.trim();
      if (!user || q.length < 2) return;
      // Mirror into both legacy `music_search_history` and the new `recent_searches`
      // table introduced in the Tier 2 search migration.
      await Promise.all([
        sb.from("music_search_history").insert({ user_id: user.id, query: q }),
        sb.from("recent_searches").insert({ user_id: user.id, query: q }),
      ]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["music-search-history"] }),
  });
}

export function useClearSearchHistory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id?: string) => {
      if (!user) return;
      const q = sb.from("music_search_history").delete().eq("user_id", user.id);
      if (id) await q.eq("id", id);
      else await q;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["music-search-history"] }),
  });
}

export function useTrendingSearches(limit = 8) {
  return useQuery<string[]>({
    queryKey: ["music-trending-searches", limit],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      // Aggregate top queries from the last 7 days across all users
      const since = new Date(Date.now() - 7 * 86400_000).toISOString();
      const { data } = await sb
        .from("music_search_history")
        .select("query")
        .gte("created_at", since)
        .limit(2000);
      const counts = new Map<string, number>();
      for (const row of (data as { query: string }[]) ?? []) {
        const k = row.query.toLowerCase().trim();
        if (k.length < 2) continue;
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([q]) => q);
    },
  });
}
