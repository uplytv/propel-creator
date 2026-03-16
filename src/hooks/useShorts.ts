import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Short {
  id: string;
  caption: string;
  creator_id: string;
  creator_type_tag: string | null;
  mux_asset_id: string | null;
  playback_id: string | null;
  like_count: number;
  view_count: number;
  created_at: string;
  // joined
  creator_name?: string;
  creator_avatar?: string;
}

export function useShorts(batchSize = 10) {
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const fetchBatch = useCallback(async (pageNum: number) => {
    const from = pageNum * batchSize;
    const to = from + batchSize - 1;

    const { data } = await supabase
      .from("shorts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data) {
      if (data.length < batchSize) setHasMore(false);

      const creatorIds = [...new Set(data.map((s) => s.creator_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", creatorIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      const enriched = data.map((s) => ({
        ...s,
        creator_name: profileMap.get(s.creator_id)?.display_name || "Creator",
        creator_avatar: profileMap.get(s.creator_id)?.avatar_url || null,
      }));

      setShorts((prev) => (pageNum === 0 ? enriched : [...prev, ...enriched]));
    }
    setLoading(false);
  }, [batchSize]);

  useEffect(() => {
    fetchBatch(0);
  }, []);

  const loadMore = () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchBatch(nextPage);
  };

  return { shorts, loading, hasMore, loadMore };
}
