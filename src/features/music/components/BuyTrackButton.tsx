import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Lock, Loader2, ShoppingCart, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Props {
  trackId: string;
  priceCents: number;
}

export default function BuyTrackButton({ trackId, priceCents }: Props) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  const { data: hasPurchased, refetch } = useQuery({
    queryKey: ["track-purchased", trackId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await (supabase as any).rpc("has_purchased_track", {
        _user_id: user.id,
        _track_id: trackId,
      });
      return !!data;
    },
    enabled: !!user && !!trackId,
  });

  // Verify after Stripe redirects back
  useEffect(() => {
    const sessionId = params.get("session_id");
    const purchased = params.get("purchased");
    if (purchased === "true" && sessionId && user) {
      (async () => {
        try {
          await supabase.functions.invoke("verify-track-purchase", {
            body: { session_id: sessionId, track_id: trackId },
          });
          await refetch();
          toast({ title: "Track unlocked", description: "Thanks for supporting the artist." });
        } catch (e: any) {
          toast({ title: "Verification failed", description: e.message, variant: "destructive" });
        } finally {
          params.delete("purchased");
          params.delete("session_id");
          setParams(params, { replace: true });
        }
      })();
    }
  }, [params, user, trackId]);

  const buy = async () => {
    if (!user) {
      toast({ title: "Sign in to buy" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-track-purchase", {
        body: { track_id: trackId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast({ title: "Could not start checkout", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (hasPurchased) {
    return (
      <span
        className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
        style={{ background: "rgba(61, 124, 255,0.15)", color: "#3D7CFF" }}
      >
        <CheckCircle2 className="w-4 h-4" /> Owned
      </span>
    );
  }

  return (
    <button
      onClick={buy}
      disabled={loading}
      className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm"
      style={{ background: "#3D7CFF", color: "#000" }}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
      Buy ${(priceCents / 100).toFixed(2)}
    </button>
  );
}

export function TrackLockOverlay({ priceCents }: { priceCents: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm">
      <div className="text-center">
        <Lock className="w-8 h-8 mx-auto mb-2 text-white/80" />
        <p className="text-white text-sm font-bold">Paid release</p>
        <p className="text-white/60 text-xs mt-1">${(priceCents / 100).toFixed(2)}</p>
      </div>
    </div>
  );
}
