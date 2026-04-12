import { useState } from "react";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface EventCheckInProps {
  eventId: string;
}

export default function EventCheckIn({ eventId }: EventCheckInProps) {
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);

  const { data: existingCheckin, refetch } = useQuery({
    queryKey: ["event-checkin", eventId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("event_checkins")
        .select("id, checked_in_at")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: checkinCount = 0 } = useQuery({
    queryKey: ["event-checkin-count", eventId],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("event_checkins")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);
      return count || 0;
    },
  });

  const handleCheckIn = async () => {
    if (!user || existingCheckin) return;
    setChecking(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { error } = await (supabase as any).from("event_checkins").insert({
        event_id: eventId,
        user_id: user.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      if (error) throw error;
      toast.success("Checked in! 📍");
      refetch();
    } catch (err: any) {
      if (err.code === 1) {
        toast.error("Enable location to check in");
      } else {
        toast.error("Check-in failed");
      }
    } finally {
      setChecking(false);
    }
  };

  if (existingCheckin) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(0,255,133,0.1)" }}>
        <CheckCircle2 className="w-4 h-4" style={{ color: "#00FF85" }} />
        <span className="text-xs font-semibold" style={{ color: "#00FF85" }}>
          Checked in · {checkinCount} here
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={handleCheckIn}
      disabled={checking}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-transform active:scale-95"
      style={{ background: "#00FF85", color: "#0A0A0A" }}
    >
      {checking ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <MapPin className="w-4 h-4" />
      )}
      I'm Here · {checkinCount} checked in
    </button>
  );
}
