import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Radio, Eye, MapPin, Ticket, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface LiveEventStream {
  id: string;
  title: string;
  mux_playback_id: string | null;
  venue_attendance_count: number;
  viewer_count: number;
  user_id: string;
  event_id: string;
  event?: {
    id: string;
    title: string;
    location_name: string | null;
    location_city: string | null;
    ticket_price: number;
    is_free: boolean;
    ticket_quantity: number | null;
    tickets_sold: number;
  };
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

interface Props {
  title: string;
  filterFollowing?: boolean;
  followingIds?: string[];
  filterCity?: string;
}

export default function LiveEventStreamsSection({ title, filterFollowing, followingIds = [], filterCity }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [streams, setStreams] = useState<LiveEventStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      let query = supabase
        .from("mux_live_streams")
        .select("id, title, mux_playback_id, venue_attendance_count, viewer_count, user_id, event_id")
        .eq("status", "active")
        .eq("is_event_stream", true)
        .not("event_id", "is", null)
        .limit(10);

      if (filterFollowing && followingIds.length > 0) {
        query = query.in("user_id", followingIds);
      }

      const { data: streamData } = await query;
      if (!streamData || streamData.length === 0) {
        setStreams([]);
        setLoading(false);
        return;
      }

      // Fetch events and profiles
      const eventIds = streamData.map((s: any) => s.event_id).filter(Boolean);
      const userIds = [...new Set(streamData.map((s: any) => s.user_id))] as string[];

      const [{ data: events }, { data: profiles }] = await Promise.all([
        supabase.from("events").select("id, title, location_name, location_city, ticket_price, is_free, ticket_quantity, tickets_sold").in("id", eventIds),
        supabase.from("profiles").select("user_id, display_name, avatar_url, username").in("user_id", userIds),
      ]);

      const eventsMap = new Map((events || []).map((e: any) => [e.id, e]));
      const profilesMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      let enriched = streamData.map((s: any) => ({
        ...s,
        event: eventsMap.get(s.event_id),
        profile: profilesMap.get(s.user_id),
      })).filter((s: any) => s.event);

      if (filterCity) {
        enriched = enriched.filter((s: any) =>
          s.event?.location_city?.toLowerCase().includes(filterCity.toLowerCase())
        );
      }

      setStreams(enriched);
      setLoading(false);
    };

    fetch();
  }, [filterFollowing, followingIds, filterCity]);

  const handleBuyInline = async (stream: LiveEventStream) => {
    if (!user) {
      navigate(`/auth?redirect=/stream/${stream.id}`);
      return;
    }
    setPurchasingId(stream.id);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-event-checkout", {
        body: {
          event_id: stream.event_id,
          success_url: `${window.location.origin}/tickets/success?event=${stream.event_id}&stream=${stream.id}`,
          cancel_url: window.location.href,
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error("Could not start checkout");
    } finally {
      setPurchasingId(null);
    }
  };

  if (loading || streams.length === 0) return null;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
        </span>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {streams.map((stream) => {
          const evt = stream.event;
          const remaining = evt?.ticket_quantity ? evt.ticket_quantity - (evt.tickets_sold || 0) : null;
          const isUrgent = remaining !== null && remaining < 20 && remaining > 0;

          return (
            <div
              key={stream.id}
              className="flex-shrink-0 w-[260px] rounded-xl border border-border overflow-hidden bg-card"
            >
              {/* Thumbnail area */}
              <button
                onClick={() => navigate(`/stream/${stream.id}`)}
                className="relative w-full aspect-video bg-black flex items-center justify-center"
              >
                {stream.mux_playback_id ? (
                  <img
                    src={`https://image.mux.com/${stream.mux_playback_id}/thumbnail.webp?width=400&height=225&time=0`}
                    alt={stream.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Radio className="w-8 h-8 text-muted-foreground" />
                )}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(239,68,68,0.8)" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span className="text-[10px] font-bold text-white">LIVE</span>
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/60">
                  <Eye className="w-3 h-3 text-white/70" />
                  <span className="text-[10px] text-white/90">{stream.viewer_count || 0}</span>
                </div>
              </button>

              {/* Info */}
              <div className="p-2.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  {stream.profile?.avatar_url ? (
                    <img src={stream.profile.avatar_url} className="w-6 h-6 rounded-full object-cover" alt={stream.profile?.display_name || "Creator"} loading="lazy" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-secondary" />
                  )}
                  <span className="text-xs font-semibold text-foreground truncate">{stream.profile?.display_name || "Creator"}</span>
                </div>

                {evt && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{evt.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{evt.location_name}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {stream.venue_attendance_count > 0 && (
                      <span className="flex items-center gap-1 text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#3D7CFF" }} />
                        <span style={{ color: "#3D7CFF" }} className="font-semibold">{stream.venue_attendance_count}</span>
                        <span className="text-muted-foreground">there</span>
                      </span>
                    )}
                    {evt && !evt.is_free && (
                      <span className="text-[10px] text-muted-foreground">
                        <Ticket className="w-2.5 h-2.5 inline mr-0.5" />${evt.ticket_price}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleBuyInline(stream)}
                    disabled={purchasingId === stream.id}
                    className="px-3 py-1 rounded-lg text-[10px] font-bold transition-all"
                    style={{
                      background: isUrgent ? "linear-gradient(135deg, #FF6B35, #FF3B30)" : "#3D7CFF",
                      color: isUrgent ? "#FFFFFF" : "#0A0A0A",
                      opacity: purchasingId === stream.id ? 0.6 : 1,
                    }}
                  >
                    {purchasingId === stream.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isUrgent ? (
                      `${remaining} left!`
                    ) : evt?.is_free ? (
                      "Free →"
                    ) : (
                      "Buy →"
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
