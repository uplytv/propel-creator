import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Monitor } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { tables } from "@/lib/supabaseTyped";
import { format } from "date-fns";

/**
 * "On UPLY" rail — UPLY-native events, browsable by consumers.
 *
 * Lists published, public, upcoming events from the `events` table sorted by
 * starts_at. Anon reads are covered by the existing RLS policy
 * "Published events are publicly readable" (USING status = 'published') and
 * the partial index idx_events_starts_at_pub (starts_at WHERE status='published'
 * AND visibility='public'). Renders nothing when there are no upcoming events.
 */

interface UplyRailEvent {
  id: string;
  title: string;
  slug: string | null;
  creator_id: string;
  cover_image_url: string | null;
  starts_at: string;
  event_type: string;
  location_city: string | null;
  location_name: string | null;
  is_free: boolean;
  ticket_price: number;
  is_sold_out: boolean;
  creator?: { username: string | null; display_name: string | null; avatar_url: string | null };
  /** Lowest purchasable price in dollars (min ticket tier, else ticket_price). */
  priceFrom: number;
  hasTiers: boolean;
}

function useUpcomingUplyEvents(limit = 12) {
  return useQuery({
    queryKey: ["on-uply-upcoming-events", limit],
    staleTime: 60_000,
    queryFn: async (): Promise<UplyRailEvent[]> => {
      const { data, error } = await tables.events()
        .select("id, title, slug, creator_id, cover_image_url, starts_at, event_type, location_city, location_name, is_free, ticket_price, is_sold_out")
        .eq("status", "published")
        .eq("visibility", "public")
        .gt("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      const rows = (data || []) as any[];
      if (rows.length === 0) return [];

      const creatorIds = [...new Set(rows.map((e) => e.creator_id))];
      const eventIds = rows.map((e) => e.id);
      const [profilesRes, tiersRes] = await Promise.all([
        supabase
          .from("profiles_public")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", creatorIds),
        supabase
          .from("ticket_tiers")
          .select("event_id, price_cents")
          .in("event_id", eventIds),
      ]);
      const profileMap = new Map(((profilesRes.data as any[]) || []).map((p) => [p.user_id, p]));
      const minTier = new Map<string, number>();
      for (const t of ((tiersRes.data as any[]) || [])) {
        const price = Number(t.price_cents || 0) / 100;
        const cur = minTier.get(t.event_id);
        if (cur === undefined || price < cur) minTier.set(t.event_id, price);
      }

      return rows.map((e) => ({
        ...e,
        creator: profileMap.get(e.creator_id),
        hasTiers: minTier.has(e.id),
        priceFrom: minTier.has(e.id) ? (minTier.get(e.id) as number) : (e.is_free ? 0 : Number(e.ticket_price) || 0),
      }));
    },
  });
}

function priceLabel(e: UplyRailEvent): string {
  if (e.is_free || e.priceFrom === 0) return "FREE";
  return e.hasTiers ? `From $${e.priceFrom.toFixed(0)}` : `$${e.priceFrom.toFixed(0)}`;
}

export default function OnUplyEventsRail() {
  const navigate = useNavigate();
  const { data: events, isLoading } = useUpcomingUplyEvents();

  if (!isLoading && (!events || events.length === 0)) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-bold text-foreground">On UPLY</h3>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: "linear-gradient(135deg, #3D7CFF, #B025FF)" }}>
          UPLY
        </span>
        <span className="text-xs text-muted-foreground">Upcoming events from UPLY creators</span>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-40 sm:w-44 shrink-0 aspect-[3/4] rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {events!.map((e) => {
            const date = new Date(e.starts_at);
            const locationText =
              e.event_type === "virtual"
                ? "Virtual"
                : e.location_city || e.location_name || (e.event_type === "hybrid" ? "Hybrid" : null);
            return (
              <div
                key={e.id}
                className="w-40 sm:w-44 shrink-0 cursor-pointer group"
                onClick={() => navigate(`/${e.creator?.username || e.creator_id}/events/${e.slug || e.id}`)}
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-muted">
                  {e.cover_image_url ? (
                    <img
                      src={e.cover_image_url}
                      alt={e.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <CalendarDays className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

                  {/* Date chip */}
                  <div className="absolute top-2 left-2 flex flex-col items-center justify-center bg-background/90 backdrop-blur rounded-md w-10 py-1 text-center leading-none">
                    <span className="text-[9px] font-bold uppercase text-primary">{format(date, "MMM")}</span>
                    <span className="text-sm font-extrabold text-foreground">{format(date, "d")}</span>
                  </div>

                  {e.is_sold_out && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white border border-white/70 rounded px-1.5 py-0.5">
                        Sold out
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <h4 className="font-bold text-white text-xs leading-tight line-clamp-2 drop-shadow">{e.title}</h4>
                    {locationText && (
                      <p className="text-[10px] text-white/80 flex items-center gap-1 mt-0.5">
                        {e.event_type === "virtual" ? <Monitor className="w-2.5 h-2.5 shrink-0" /> : <MapPin className="w-2.5 h-2.5 shrink-0" />}
                        <span className="truncate">{locationText}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-primary truncate">{format(date, "EEE MMM d · h:mm a")}</span>
                  <span className="text-xs font-bold shrink-0 text-foreground">
                    {e.is_free || e.priceFrom === 0 ? <span className="text-primary">FREE</span> : priceLabel(e)}
                  </span>
                </div>
                {(e.creator?.display_name || e.creator?.username) && (
                  <p className="text-[10px] text-muted-foreground truncate">{e.creator.display_name || e.creator.username}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
