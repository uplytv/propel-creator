import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { UPLYMuxPlayer } from "@/components/MuxPlayer";
import StreamChat from "@/components/live/StreamChat";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Radio, Lock, Ticket, Clock } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";
import { format, formatDistanceToNow, isFuture } from "date-fns";

export default function EventLiveStream() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [ppvTiers, setPpvTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const { data: ev } = await (supabase as any)
        .from("events")
        .select("id, title, slug, is_live, live_stream_id, creator_id, cover_image_url, starts_at")
        .eq("id", eventId)
        .maybeSingle();
      setEvent(ev);

      // Resolve the Mux playback id for this event's live stream.
      if (ev?.live_stream_id) {
        const { data: stream } = await supabase
          .from("mux_live_streams")
          .select("mux_playback_id")
          .eq("id", ev.live_stream_id)
          .maybeSingle();
        setPlaybackId((stream as any)?.mux_playback_id ?? null);
      }

      // Access check (server-side).
      if (user) {
        const { data: access } = await (supabase as any).rpc("has_event_livestream_access", { _event_id: eventId });
        setHasAccess(!!access);
      }

      // PPV passes available for purchase (livestream tiers).
      const { data: tiers } = await (supabase as any)
        .from("ticket_tiers")
        .select("id, name, price_cents, is_livestream")
        .eq("event_id", eventId)
        .eq("is_livestream", true)
        .eq("is_hidden", false);
      setPpvTiers((tiers as any[]) ?? []);

      setLoading(false);
    })();
  }, [eventId, user]);

  const buyPpv = async (tierId: string) => {
    if (!user) { navigate("/auth"); return; }
    setBuying(tierId);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-ticket", {
        body: { tier_id: tierId, quantity: 1, success_url: `${window.location.origin}/events/${eventId}/watch` },
      });
      if (error) throw error;
      if ((data as any)?.url) window.location.href = (data as any).url;
    } catch (e: any) {
      toast.error("Couldn't start checkout", { description: e?.message });
      setBuying(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white/60" /></div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <SEOHead title={`Watch Live · ${event?.title ?? "Event"}`} description="Live stream PPV" />
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => navigate(event?.slug ? `/e/${event.slug}` : "/events")} aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-bold truncate">{event?.title}</h1>
        {event?.is_live && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold">
            <Radio className="w-3 h-3" /> LIVE
          </span>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {hasAccess ? (
          event?.is_live && playbackId ? (
            <div className="grid lg:grid-cols-[1fr_340px] gap-4 pb-6">
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black h-fit">
                <UPLYMuxPlayer playbackId={playbackId} title={event.title} streamType="live" autoPlay muted={false} />
              </div>
              <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5 h-[420px] lg:h-[600px]">
                <StreamChat streamId={event.live_stream_id} creatorUserId={event.creator_id} isLoggedIn={!!user} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center">
              <Clock className="w-10 h-10 mx-auto mb-3 text-white/50" />
              <p className="font-semibold">You're in. The stream hasn't started yet.</p>
              {event?.starts_at && isFuture(new Date(event.starts_at)) ? (
                <p className="text-sm text-white/60 mt-1">
                  Starts {formatDistanceToNow(new Date(event.starts_at), { addSuffix: true })} · {format(new Date(event.starts_at), "EEE, MMM d 'at' h:mm a")}
                </p>
              ) : (
                <p className="text-sm text-white/60 mt-1">Keep this page open — it'll go live automatically.</p>
              )}
            </div>
          )
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <Lock className="w-10 h-10 mx-auto mb-3 text-white/50" />
            <h2 className="text-lg font-bold">Watch from anywhere</h2>
            <p className="text-sm text-white/60 mt-1 max-w-sm mx-auto">
              Can't make it in person? Grab a Live Stream pass and watch {event?.title} live in HD.
            </p>
            {event?.starts_at && (
              <p className="text-xs text-white/40 mt-2 mb-5">
                {format(new Date(event.starts_at), "EEE, MMM d 'at' h:mm a")}
              </p>
            )}
            {ppvTiers.length > 0 ? (
              <div className="space-y-2 max-w-xs mx-auto">
                {ppvTiers.map((t) => (
                  <Button key={t.id} className="w-full gap-2" disabled={!!buying} onClick={() => buyPpv(t.id)}>
                    {buying === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                    {t.name} · ${(t.price_cents / 100).toFixed(2)}
                  </Button>
                ))}
              </div>
            ) : (
              <Button onClick={() => navigate(event?.slug ? `/e/${event.slug}` : `/events`)} className="gap-2">
                <Ticket className="w-4 h-4" /> Get tickets
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
