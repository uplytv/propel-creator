import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DiscoverRow from "./DiscoverRow";

type Source = "live" | "trending" | "recordings";

interface Item {
  id: string;
  title: string;
  thumb: string | null;
  meta: string;
  href: string;
  isLive?: boolean;
}

async function load(source: Source): Promise<Item[]> {
  if (source === "live") {
    const { data } = await supabase
      .from("mux_live_streams_public")
      .select("id, title, mux_playback_id, viewer_count")
      .eq("status", "active")
      .eq("is_public", true)
      .order("viewer_count", { ascending: false })
      .limit(12);
    return (data || []).map((s: any) => ({
      id: s.id,
      title: s.title || "Live",
      thumb: s.mux_playback_id ? `https://image.mux.com/${s.mux_playback_id}/thumbnail.jpg?time=5&width=600` : null,
      meta: `${(s.viewer_count || 0).toLocaleString()} watching`,
      href: `/stream/${s.id}`,
      isLive: true,
    }));
  }
  if (source === "trending") {
    const { data } = await supabase
      .from("videos")
      .select("id, title, thumbnail_url, playback_id, view_count")
      .eq("is_public", true)
      .order("trending_score", { ascending: false })
      .limit(12);
    return (data || []).map((v: any) => ({
      id: v.id,
      title: v.title,
      thumb: v.thumbnail_url || (v.playback_id ? `https://image.mux.com/${v.playback_id}/thumbnail.jpg?time=5&width=600` : null),
      meta: `${(v.view_count || 0).toLocaleString()} views`,
      href: `/stream/${v.id}?type=vod`,
    }));
  }
  const { data } = await supabase
    .from("stream_recordings")
    .select("id, title, playback_id, view_count")
    .eq("is_published", true)
    .order("view_count", { ascending: false })
    .limit(12);
  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    thumb: r.playback_id ? `https://image.mux.com/${r.playback_id}/thumbnail.jpg?time=5&width=600` : null,
    meta: `${(r.view_count || 0).toLocaleString()} views`,
    href: `/stream/${r.id}?type=vod`,
  }));
}

export default function ContentRail({
  source,
  title,
  subtitle,
}: {
  source: Source;
  title: string;
  subtitle?: string;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load(source).then((d) => {
      setItems(d);
      setLoading(false);
    });
  }, [source]);

  if (loading) {
    return (
      <DiscoverRow title={title} subtitle={subtitle}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="snap-start shrink-0 w-[180px] md:w-[260px] aspect-video bg-muted animate-pulse rounded-md" />
        ))}
      </DiscoverRow>
    );
  }
  if (!items.length) return null;

  return (
    <DiscoverRow title={title} subtitle={subtitle}>
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => navigate(it.href)}
          className="group/card snap-start shrink-0 w-[180px] md:w-[260px] text-left rounded-md overflow-hidden hover:scale-[1.05] transition-transform duration-200 origin-center"
        >
          <div className="relative aspect-video bg-muted overflow-hidden rounded-md">
            {it.thumb ? (
              <img src={it.thumb} alt={it.title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            {it.isLive && (
              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-destructive text-destructive-foreground animate-pulse">
                LIVE
              </span>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
          </div>
          <div className="pt-1.5 px-0.5">
            <p className="text-xs md:text-sm font-semibold text-foreground line-clamp-1">{it.title}</p>
            <p className="text-[10px] md:text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Eye className="w-2.5 h-2.5" /> {it.meta}
            </p>
          </div>
        </button>
      ))}
    </DiscoverRow>
  );
}
