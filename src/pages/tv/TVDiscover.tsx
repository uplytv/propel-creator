import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";

interface LiveRow {
  id: string;
  title: string | null;
  category: string | null;
  mux_playback_id: string | null;
  viewer_count: number | null;
  user_id: string;
}

const CATEGORY_ROWS = [
  { label: "Live now", filter: null },
  { label: "Gaming", filter: "Gaming" },
  { label: "Music & DJ", filter: "Music" },
  { label: "Talk shows", filter: "Talk" },
  { label: "BAZI Live", filter: "BAZI" },
];

function thumbFor(playbackId: string | null) {
  if (!playbackId) return null;
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&fit_mode=preserve`;
}

export default function TVDiscover() {
  const [streams, setStreams] = useState<LiveRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mux_live_streams")
        .select("id, title, category, mux_playback_id, viewer_count, user_id, status, is_public, orientation")
        .eq("status", "active")
        .eq("is_public", true)
        .neq("orientation", "portrait")
        .order("viewer_count", { ascending: false })
        .limit(60);
      setStreams((data as any) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
      <SEOHead title="UPLY TV — Live entertainment on the big screen" description="Watch live UPLY streams on Roku, Fire TV, LG, and more." />
      <header className="px-12 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black tracking-tight">UPLY</span>
          <span className="text-xs uppercase tracking-widest text-primary">TV</span>
        </div>
        <div className="text-sm opacity-60">Press OK to watch · Long-press for products</div>
      </header>

      {CATEGORY_ROWS.map((row) => {
        const items = row.filter
          ? streams.filter((s) => (s.category || "").toLowerCase().includes(row.filter!.toLowerCase()))
          : streams;
        if (!items.length && row.filter) return null;
        return (
          <section key={row.label} className="mb-12">
            <h2 className="px-12 mb-4 text-2xl font-bold">{row.label}</h2>
            <div className="px-12 grid grid-cols-4 gap-6">
              {loading && Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-video bg-white/5 animate-pulse rounded-xl" />
              ))}
              {!loading && items.length === 0 && (
                <p className="opacity-50 col-span-4 text-lg">No live streams right now.</p>
              )}
              {items.slice(0, 8).map((s) => (
                <Link
                  key={s.id}
                  to={`/tv/watch/${s.id}`}
                  className="group block rounded-xl overflow-hidden bg-white/5 focus:outline-none focus:ring-4 focus:ring-primary transition-transform hover:scale-105 focus:scale-105"
                >
                  <div className="aspect-video bg-black relative">
                    {thumbFor(s.mux_playback_id) ? (
                      <img src={thumbFor(s.mux_playback_id)!} alt={s.title || "Live"} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl opacity-40">●</div>
                    )}
                    <span className="absolute top-3 left-3 bg-red-600 text-white px-2 py-0.5 text-xs font-bold rounded">LIVE</span>
                    {(s.viewer_count ?? 0) > 0 && (
                      <span className="absolute bottom-3 right-3 bg-black/70 px-2 py-0.5 text-xs rounded">
                        {s.viewer_count} watching
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-base font-semibold line-clamp-1">{s.title || "Untitled stream"}</div>
                    <div className="text-xs opacity-60 mt-1">{s.category || "Live"}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
