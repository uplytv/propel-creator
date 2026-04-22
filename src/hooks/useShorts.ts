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
  source: "short" | "clip";
  featured_product_id: string | null;
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

    // Fetch from both shorts and clips tables
    const [shortsRes, clipsRes] = await Promise.all([
      supabase
        .from("shorts")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to),
      supabase
        .from("clips")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .range(from, to),
    ]);

    const shortsData = (shortsRes.data || []).map((s: any) => ({
      id: s.id,
      caption: s.caption,
      creator_id: s.creator_id,
      creator_type_tag: s.creator_type_tag,
      mux_asset_id: s.mux_asset_id,
      playback_id: s.playback_id,
      like_count: s.like_count || 0,
      view_count: s.view_count || 0,
      created_at: s.created_at,
      source: "short" as const,
      featured_product_id: s.featured_product_id ?? null,
    }));

    const clipsData = (clipsRes.data || []).map((c: any) => ({
      id: c.id,
      caption: c.caption,
      creator_id: c.creator_id,
      creator_type_tag: null,
      mux_asset_id: c.clip_asset_id,
      playback_id: c.clip_playback_id,
      like_count: c.view_count || 0,
      view_count: c.view_count || 0,
      created_at: c.created_at,
      source: "clip" as const,
      featured_product_id: c.featured_product_id ?? null,
    }));

    // Merge and sort by date
    const combined = [...shortsData, ...clipsData].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (combined.length < batchSize) setHasMore(false);

    // Enrich with profiles
    const creatorIds = [...new Set(combined.map((s) => s.creator_id))];
    const { data: profiles } = await supabase
      .from("profiles_public")
      .select("user_id, display_name, avatar_url")
      .in("user_id", creatorIds);

    const profileMap = new Map((profiles as any[])?.map((p: any) => [p.user_id, p]) || []);

    const enriched = combined.map((s) => ({
      ...s,
      creator_name: profileMap.get(s.creator_id)?.display_name || "Creator",
      creator_avatar: profileMap.get(s.creator_id)?.avatar_url || null,
    }));

    setShorts((prev) => (pageNum === 0 ? enriched : [...prev, ...enriched]));
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
