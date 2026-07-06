import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Flame, MapPin } from "lucide-react";
import GoingButton from "./GoingButton";

/**
 * Full-width festival cards sourced from events_global.
 * Heuristic: festival = title or genre contains "festival" / "fest" or category=festival.
 */
export default function FestivalsSection({ limit = 12 }: { limit?: number }) {
  const navigate = useNavigate();

  const { data: festivals = [], isLoading } = useQuery({
    queryKey: ["festivals-global", limit],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await (supabase as any)
        .from("events_global")
        .select("*")
        .gte("date", nowIso)
        .or("title.ilike.%festival%,title.ilike.%fest%,category.ilike.%festival%,genre.ilike.%festival%")
        .order("date", { ascending: true })
        .limit(limit);
      return data || [];
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="px-4 py-3 space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (festivals.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
          <Flame className="w-4 h-4" style={{ color: "#FF6B35" }} /> Festivals
        </h2>
        <span className="text-[11px] text-muted-foreground">{festivals.length} upcoming</span>
      </div>

      <div className="space-y-3">
        {festivals.map((f: any) => (
          <button
            key={f.id}
            onClick={() => navigate(`/global-events/${f.id}`)}
            className="block w-full text-left rounded-2xl overflow-hidden transition-transform active:scale-[0.99]"
            style={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <div className="relative aspect-[16/9]">
              {f.image_url ? (
                <img src={f.image_url} alt={f.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <span className="text-4xl">🎪</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white font-bold text-lg leading-tight line-clamp-2 drop-shadow">
                  {f.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-white/85">
                  {f.date && <span>{format(new Date(f.date), "MMM d")}</span>}
                  {f.city && (
                    <>
                      <span className="text-white/40">·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {f.city}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {f.genre && (
                <span
                  className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                  style={{ backgroundColor: "rgba(255,107,53,0.9)", color: "white" }}
                >
                  🔥 {f.genre}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-[11px] text-muted-foreground">
                Tap to view details
              </span>
              <div onClick={(e) => e.stopPropagation()}>
                <GoingButton
                  globalEventId={f.id}
                  eventTitle={f.title}
                  eventDate={f.date}
                  size="sm"
                  variant="filled"
                />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
