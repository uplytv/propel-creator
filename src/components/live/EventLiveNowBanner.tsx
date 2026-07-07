import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Radio, Play, Ticket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface EventLiveNowBannerProps {
  eventId: string;
}

export default function EventLiveNowBanner({ eventId }: EventLiveNowBannerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liveStream, setLiveStream] = useState<any>(null);
  const [creatorName, setCreatorName] = useState("");
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    const fetchLiveStream = async () => {
      const { data } = await supabase
        .from("mux_live_streams")
        .select("id, user_id, title, slug, venue_attendance_count")
        .eq("event_id", eventId)
        .eq("status", "active")
        .eq("is_event_stream", true)
        .limit(1)
        .maybeSingle();

      if (data) {
        setLiveStream(data);
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("user_id", data.user_id)
          .maybeSingle();
        if (profile) setCreatorName(profile.display_name || profile.username || "Creator");
      }
    };

    fetchLiveStream();

    // Subscribe to stream changes for this event
    const channel = supabase
      .channel(`event-live-${eventId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "mux_live_streams",
        filter: `event_id=eq.${eventId}`,
      }, (payload: any) => {
        if (payload.new?.status === "active" && payload.new?.is_event_stream) {
          setLiveStream(payload.new);
        } else if (payload.new?.status !== "active") {
          setLiveStream(null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  if (!liveStream) return null;

  const handleWatchLive = () => {
    navigate(`/stream/${liveStream.id}`);
  };

  const handleBuyTicket = async () => {
    if (!user) {
      navigate(`/auth?redirect=${window.location.pathname}`);
      return;
    }
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-event-checkout", {
        body: {
          event_id: eventId,
          success_url: `${window.location.origin}/tickets/success?event=${eventId}&stream=${liveStream.id}`,
          cancel_url: window.location.href,
        },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error("Could not start checkout");
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div
      className="rounded-xl p-4 mb-4"
      style={{
        background: "rgba(255,59,48,0.08)",
        border: "1px solid rgba(255,59,48,0.25)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
          </span>
          <span className="text-sm font-bold text-destructive">LIVE NOW</span>
        </div>
        <span className="text-sm text-muted-foreground">— See what's happening</span>
      </div>
      <p className="text-sm text-foreground mb-3">
        {creatorName} is streaming from inside the venue right now
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="default" onClick={handleWatchLive} className="gap-1.5">
          <Play className="w-3.5 h-3.5" /> Watch Live
        </Button>
        <Button size="sm" variant="outline" onClick={handleBuyTicket} disabled={purchasing} className="gap-1.5">
          {purchasing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ticket className="w-3.5 h-3.5" />}
          Buy Ticket
        </Button>
      </div>
    </div>
  );
}
