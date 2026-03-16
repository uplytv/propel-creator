import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface SearchResult {
  id: string;
  type: "creator" | "product" | "stream" | "recording" | "job";
  title: string;
  subtitle?: string;
  image?: string | null;
  link: string;
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

    const [profiles, products, streams, recordings, jobs] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, username, avatar_url").or(`display_name.ilike.${term},username.ilike.${term}`).limit(5),
      supabase.from("products").select("id, name, image_url, type, price").ilike("name", term).eq("status", "active").limit(5),
      supabase.from("mux_live_streams_public").select("id, title, user_id, status, mux_playback_id").ilike("title", term).limit(5),
      supabase.from("stream_recordings").select("id, title, creator_id, playback_id").ilike("title", term).eq("is_published", true).limit(5),
      supabase.from("jobs").select("id, title, status, skill_category").ilike("title", term).eq("status", "open").limit(5),
    ]);

    const mapped: SearchResult[] = [
      ...(profiles.data ?? []).map((p) => ({
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
    ];

    setResults(mapped);
    setLoading(false);
  }, []);

  return { query, search, results, loading, setQuery };
}
