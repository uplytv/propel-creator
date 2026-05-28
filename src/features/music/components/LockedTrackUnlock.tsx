import { useState } from "react";
import { Lock, Loader2, ShoppingCart, Crown, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useAccess } from "@/hooks/useAccess";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface LockedTrack {
  id: string;
  title: string;
  creator_id: string;
  is_locked: boolean;
  unlock_type: "purchase" | "subscription" | "both" | null;
  unlock_price_cents: number | null;
  required_tier_id: string | null;
  preview_url: string | null;
  preview_duration_seconds: number;
  required_tier_name?: string | null;
}

/**
 * Fan-facing unlock UI for a locked track.
 * Uses the existing access system (useAccess on resource_type='track')
 * so post-payment unlock is instant via the access_grants realtime channel.
 */
export default function LockedTrackUnlock({ track }: { track: LockedTrack }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasAccess, isLoading } = useAccess("track", track.id);
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!track.is_locked || hasAccess) return null;

  const priceLabel = track.unlock_price_cents
    ? `$${(track.unlock_price_cents / 100).toFixed(2)}`
    : "";

  const tierLabel = track.required_tier_name || "members";

  const handleBuy = async () => {
    if (!user) {
      navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-track-purchase", {
        body: { track_id: track.id },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast({ title: "Could not start checkout", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleSubscribe = () => {
    navigate(`/u/${track.creator_id}?subscribe=${track.required_tier_id ?? ""}`);
  };

  const showBuy = track.unlock_type === "purchase" || track.unlock_type === "both";
  const showSub = track.unlock_type === "subscription" || track.unlock_type === "both";

  return (
    <div
      className="relative rounded-2xl p-5 overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(61,124,255,0.12) 0%, rgba(176,37,255,0.12) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Lock className="w-4 h-4 text-white/80" />
        <span className="text-xs font-bold tracking-wide text-white/80 uppercase">
          Unreleased · locked
        </span>
      </div>

      {track.preview_url && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setPreviewing((p) => !p)}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-white/10 hover:bg-white/15 text-white"
          >
            <Play className="w-4 h-4" />
            {previewing ? "Hide preview" : `Play ${track.preview_duration_seconds}s preview`}
          </button>
          {previewing && (
            <audio
              controls
              autoPlay
              src={track.preview_url}
              className="mt-3 w-full"
              onEnded={() => setPreviewing(false)}
            />
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {showBuy && (
          <button
            onClick={handleBuy}
            disabled={busy || isLoading}
            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm text-white disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #3D7CFF 0%, #B025FF 100%)",
            }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            Unlock · {priceLabel}
          </button>
        )}
        {showSub && (
          <button
            onClick={handleSubscribe}
            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm text-white"
            style={{
              background:
                track.unlock_type === "subscription"
                  ? "linear-gradient(135deg, #3D7CFF 0%, #B025FF 100%)"
                  : "rgba(255,255,255,0.1)",
            }}
          >
            <Crown className="w-4 h-4" />
            {track.unlock_type === "both" ? `Get with ${tierLabel}` : `Included with ${tierLabel}`}
          </button>
        )}
      </div>
    </div>
  );
}
