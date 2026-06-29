import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getCuratedResults } from "@/lib/curatedSearch";

export interface SearchResult {
  id: string;
  type: "creator" | "product" | "stream" | "recording" | "job" | "track" | "album" | "artist" | "page" | "blog";
  title: string;
  subtitle?: string;
  image?: string | null;
  link: string;
  verified?: boolean;
  followKey?: string;
}

export function useSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const term = `%${q.trim()}%`;

    const sb = supabase as any;
    const [profiles, products, streams, recordings, jobs, tracks, albums, artists] = await Promise.all([
      supabase.from("profiles_public").select("user_id, display_name, username, avatar_url").or(`display_name.ilike.${term},username.ilike.${term}`).limit(5),
      supabase.from("products").select("id, name, image_url, type, price").ilike("name", term).eq("status", "active").limit(5),
      supabase.from("mux_live_streams_public").select("id, title, user_id, status, mux_playback_id").ilike("title", term).limit(5),
      supabase.from("stream_recordings").select("id, title, creator_id, playback_id").ilike("title", term).eq("is_published", true).limit(5),
      supabase.from("jobs").select("id, title, status, skill_category").ilike("title", term).eq("status", "open").limit(5),
      sb.from("tracks").select("id, title, cover_art_url, creator_id").ilike("title", term).eq("is_published", true).limit(5),
      sb.from("albums").select("id, title, cover_art_url, creator_id").ilike("title", term).eq("is_published", true).limit(3),
      sb.from("artist_profiles").select("user_id, monthly_listeners_cache, profiles:profiles_public!inner(display_name, username, avatar_url)").or(`display_name.ilike.${term},username.ilike.${term}`, { foreignTable: "profiles" }).limit(3),
    ]);

    const mapped: SearchResult[] = [
      ...((profiles.data as any[]) ?? []).map((p: any) => ({
        id: p.user_id,
        type: "creator" as const,
        title: p.display_name || p.username || "Creator",
        subtitle: p.username ? `@${p.username}` : undefined,
        image: p.avatar_url,
        link: `/creator/${p.username || p.user_id}`,
      })),
      ...(products.data ?? []).map((p) => ({
        id: p.id,
        type: "product" as const,
        title: p.name,
        subtitle: `$${p.price} · ${p.type}`,
        image: p.image_url,
        link: `/products`,
      })),
      ...(streams.data ?? []).map((s) => ({
        id: s.id!,
        type: "stream" as const,
        title: s.title || "Untitled Stream",
        subtitle: s.status === "active" ? "🔴 Live Now" : "Stream",
        image: s.mux_playback_id ? `https://image.mux.com/${s.mux_playback_id}/thumbnail.jpg` : null,
        link: `/stream/${s.id}`,
      })),
      ...(recordings.data ?? []).map((r) => ({
        id: r.id,
        type: "recording" as const,
        title: r.title,
        subtitle: "Recording",
        image: r.playback_id ? `https://image.mux.com/${r.playback_id}/thumbnail.jpg` : null,
        link: `/stream/${r.id}?type=recording`,
      })),
      ...(jobs.data ?? []).map((j) => ({
        id: j.id,
        type: "job" as const,
        title: j.title,
        subtitle: j.skill_category,
        image: null,
        link: `/jobs/${j.id}`,
      })),
      ...((tracks?.data as any[]) ?? []).map((t: any) => ({
        id: t.id,
        type: "track" as const,
        title: t.title,
        subtitle: "Track",
        image: t.cover_art_url,
        link: `/music/track/${t.id}`,
      })),
      ...((albums?.data as any[]) ?? []).map((a: any) => ({
        id: a.id,
        type: "album" as const,
        title: a.title,
        subtitle: "Album",
        image: a.cover_art_url,
        link: `/music/album/${a.id}`,
      })),
      ...((artists?.data as any[]) ?? []).map((a: any) => ({
        id: a.user_id,
        type: "artist" as const,
        title: a.profiles?.display_name || a.profiles?.username || "Artist",
        subtitle: a.monthly_listeners_cache ? `${a.monthly_listeners_cache.toLocaleString()} monthly listeners` : "Artist",
        image: a.profiles?.avatar_url,
        link: `/music/artist/${a.user_id}`,
      })),
    ];

    // Inject curated/hand-picked results (e.g. Arya XO) at the top, and
    // de-duplicate any DB result that resolves to the same destination link.
    const curated: SearchResult[] = getCuratedResults(q).map((c) => ({
      id: c.id,
      type: c.type,
      title: c.title,
      subtitle: c.subtitle,
      image: c.image ?? null,
      link: c.link,
      verified: c.verified,
      followKey: c.followKey,
    }));
    const curatedLinks = new Set(curated.map((c) => c.link));
    const deduped = mapped.filter((r) => !curatedLinks.has(r.link));

    setResults([...curated, ...deduped]);
    setLoading(false);
  }, []);

  return { query, search, results, loading, setQuery };
}
