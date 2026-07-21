import { useState, useEffect, useCallback, useRef } from "react";
import { Lock, Loader2, Ticket, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export type PpvRefType = "stream" | "recording" | "asset";

export interface PpvGateState {
  /** RPC has answered at least once */
  checked: boolean;
  /** the content is pay-per-view */
  isPpv: boolean;
  /** current user may watch (payer / creator / event ticket holder) */
  allowed: boolean;
  price: number | null;
  ppvProductId: string | null;
  /** source mux_live_streams.id (recordings/assets resolve back to it) */
  sourceStreamId: string | null;
  /** playback id served by the SECURITY DEFINER RPC — only set when allowed */
  playbackId: string | null;
  /** Mux playback JWT (aud "v") when the playback id is signed-policy */
  playbackToken: string | null;
  /** Mux image JWT (aud "t") for thumbnails of signed-policy content */
  thumbnailToken: string | null;
  refresh: () => Promise<void>;
}

/**
 * Server-verified PPV gate.
 *
 * Access is resolved through the SECURITY DEFINER RPC `get_stream_playback`
 * (migration 20260706160000_ppv_access.sql): the playback id for PPV content
 * never leaves the database unless the caller is entitled (completed
 * live_purchases row written by the stripe-webhook, creator, or event ticket).
 *
 * Instant unlock (no manual refresh):
 *  - realtime subscription on the buyer's live_purchases rows — the webhook
 *    flipping status to "completed" triggers a re-check;
 *  - poll fallback after checkout has been opened (covers realtime hiccups);
 *  - focus/visibility re-check for mobile new-tab checkout returns;
 *  - `?purchase=ppv_success` return param starts an aggressive poll.
 */
export function useStreamPpvGate(
  refId: string | undefined,
  refType: PpvRefType,
  /** false when the stream row says is_ppv=false — skips the RPC entirely */
  mightBePpv: boolean,
) {
  const { user } = useAuth();
  const [state, setState] = useState<{
    checkedRefId: string | null;
    isPpv: boolean;
    allowed: boolean;
    price: number | null;
    ppvProductId: string | null;
    sourceStreamId: string | null;
    playbackId: string | null;
    playbackToken: string | null;
    thumbnailToken: string | null;
  }>({
    checkedRefId: null,
    isPpv: false,
    allowed: true,
    price: null,
    ppvProductId: null,
    sourceStreamId: null,
    playbackId: null,
    playbackToken: null,
    thumbnailToken: null,
  });
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenMintedAtRef = useRef<number | null>(null);
  const tokenRefreshingRef = useRef(false);

  // "checked" is keyed to the ref id so a late-loading dbStream can never
  // reuse a stale answer (which would flash "unavailable" or leak past gate).
  const checked = !mightBePpv || (!!refId && state.checkedRefId === refId);

  /**
   * Mint per-viewer Mux playback JWTs via the sign-playback-token edge fn.
   * The fn re-runs get_stream_playback server-side (entitlement stays there)
   * and returns { signed: false } for public-policy playback ids or when the
   * signing secrets aren't configured — the client then plays the plain URL,
   * i.e. exactly the pre-signed-playback behavior. Any failure falls back the
   * same way so legacy public PPV streams can never be broken by this call.
   */
  const mintPlaybackToken = useCallback(async (): Promise<{
    token: string | null;
    thumbnailToken: string | null;
  }> => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return { token: null, thumbnailToken: null };
      const { data, error } = await supabase.functions.invoke("sign-playback-token", {
        body: { ref_id: refId, ref_type: refType },
      });
      if (error || !data?.signed || !data?.token) return { token: null, thumbnailToken: null };
      tokenMintedAtRef.current = Date.now();
      return { token: data.token as string, thumbnailToken: (data.thumbnail_token as string) || null };
    } catch {
      return { token: null, thumbnailToken: null };
    }
  }, [refId, refType]);

  const refresh = useCallback(async () => {
    if (!refId || !mightBePpv) return;
    const { data: rpcData, error } = await supabase.rpc("get_stream_playback", {
      p_ref_id: refId,
      p_ref_type: refType,
    });
    const data = rpcData as any;
    if (error) {
      // RPC missing (migration not deployed yet) → fail open so free streams
      // keep working; PPV enforcement then rests on the stream row itself.
      console.warn("[ppv] get_stream_playback failed:", error.message);
      setState(s => ({ ...s, checkedRefId: refId }));
      return;
    }
    if (!data?.found) {
      setState(s => ({ ...s, checkedRefId: refId }));
      return;
    }
    // Signed playback: PPV content the viewer may watch gets a per-viewer
    // token minted before the player mounts (no tokenless 403 flash).
    let token: string | null = null;
    let thumbnailToken: string | null = null;
    if (data.is_ppv && data.allowed && data.playback_id) {
      ({ token, thumbnailToken } = await mintPlaybackToken());
    }
    setState({
      checkedRefId: refId,
      isPpv: !!data.is_ppv,
      allowed: !!data.allowed,
      price: data.ppv_price != null ? Number(data.ppv_price) : null,
      ppvProductId: data.ppv_product_id || null,
      sourceStreamId: data.stream_id || null,
      playbackId: data.playback_id || null,
      playbackToken: token,
      thumbnailToken,
    });
  }, [refId, refType, mightBePpv, mintPlaybackToken]);

  /**
   * Mid-watch token expiry (tokens live 6h): the player calls this on fatal
   * playback errors. It only acts when the current token is >5h old — that
   * guard makes it safe to call on ANY fatal error without refresh loops.
   */
  const handlePlaybackAuthError = useCallback(async () => {
    const mintedAt = tokenMintedAtRef.current;
    if (!mintedAt || Date.now() - mintedAt < 5 * 60 * 60 * 1000) return;
    if (tokenRefreshingRef.current) return;
    tokenRefreshingRef.current = true;
    try {
      const { token, thumbnailToken } = await mintPlaybackToken();
      if (token) {
        setState(s => ({ ...s, playbackToken: token, thumbnailToken }));
      }
    } finally {
      tokenRefreshingRef.current = false;
    }
  }, [mintPlaybackToken]);

  useEffect(() => {
    if (!mightBePpv) return;
    refresh();
  }, [refresh, mightBePpv]);

  // Instant unlock: watch my live_purchases; webhook completion re-checks.
  useEffect(() => {
    if (!user || !mightBePpv || !checked || !state.isPpv || state.allowed) return;
    const channel = supabase
      .channel(`ppv-unlock-${refId}-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_purchases", filter: `buyer_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.new?.status === "completed") refresh();
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, refId, mightBePpv, checked, state.isPpv, state.allowed, refresh]);

  // Re-check when the tab regains focus (mobile checkout returns).
  useEffect(() => {
    if (!mightBePpv || !checked || !state.isPpv || state.allowed) return;
    const onFocus = () => refresh();
    const onVisibility = () => { if (!document.hidden) refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mightBePpv, checked, state.isPpv, state.allowed, refresh]);

  /** Start a bounded poll (used right after checkout opens / on ppv_success return). */
  const startUnlockPoll = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    let attempts = 0;
    pollTimer.current = setInterval(() => {
      attempts += 1;
      if (attempts > 45) { // ~3 minutes
        if (pollTimer.current) clearInterval(pollTimer.current);
        pollTimer.current = null;
        return;
      }
      refresh();
    }, 4000);
  }, [refresh]);

  // Stop polling once unlocked; clean up on unmount.
  useEffect(() => {
    if (state.allowed && pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, [state.allowed]);
  useEffect(() => () => { if (pollTimer.current) clearInterval(pollTimer.current); }, []);

  // Checkout return: ?purchase=ppv_success
  useEffect(() => {
    if (!mightBePpv) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchase") === "ppv_success") {
      const url = new URL(window.location.href);
      url.searchParams.delete("purchase");
      window.history.replaceState({}, "", url.toString());
      toast.success("Payment received", { description: "Unlocking your stream…" });
      refresh();
      startUnlockPoll();
    }
  }, [mightBePpv, refresh, startUnlockPoll]);

  return {
    checked,
    isPpv: state.isPpv,
    allowed: state.allowed,
    price: state.price,
    ppvProductId: state.ppvProductId,
    sourceStreamId: state.sourceStreamId,
    playbackId: state.playbackId,
    playbackToken: state.playbackToken,
    thumbnailToken: state.thumbnailToken,
    refresh,
    startUnlockPoll,
    handlePlaybackAuthError,
  };
}

interface PPVPaywallProps {
  title: string;
  creatorName: string;
  price: number | null;
  ppvProductId: string | null;
  isLive: boolean;
  onRefresh: () => Promise<void>;
  onCheckoutStarted: () => void;
}

/** Lock cover rendered in place of the player for non-payers. */
export default function PPVPaywall({
  title, creatorName, price, ppvProductId, isLive, onRefresh, onCheckoutStarted,
}: PPVPaywallProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [buying, setBuying] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const handleBuy = async () => {
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!ppvProductId) {
      toast.error("Purchase unavailable", { description: "The creator hasn't finished PPV setup for this stream." });
      return;
    }
    setBuying(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-live-purchase", {
        body: { live_product_id: ppvProductId, return_url: window.location.href },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Checkout failed");
      if (data?.already_owned) {
        toast.success("You already own this stream — unlocking…");
        await onRefresh();
        return;
      }
      if (data?.url) {
        window.open(data.url, "_blank");
        setWaiting(true);
        onCheckoutStarted();
        toast("Checkout opened in a new tab", { description: "This page unlocks automatically once payment completes." });
      }
    } catch (e: any) {
      toast.error("Couldn't start checkout", { description: e.message });
    } finally {
      setBuying(false);
    }
  };

  return (
    <div
      className="relative w-full aspect-video flex items-center justify-center overflow-hidden border-b border-border"
      style={{ background: "radial-gradient(120% 120% at 50% 0%, rgba(61,124,255,0.18) 0%, rgba(176,37,255,0.10) 40%, #0A0A0A 100%)" }}
    >
      <div className="text-center px-6 max-w-md">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "rgba(61,124,255,0.15)" }}>
          <Lock className="w-7 h-7" style={{ color: "#3D7CFF" }} />
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          {isLive && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold text-white bg-red-600">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </span>
          )}
          <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: "rgba(176,37,255,0.15)", color: "#B025FF" }}>
            PAY-PER-VIEW
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white mb-1">{title}</h2>
        <p className="text-sm text-white/50 mb-5">
          {creatorName} made this a pay-per-view {isLive ? "stream" : "replay"}. Buy once, watch live and on replay.
        </p>

        {waiting ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-white/70">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#3D7CFF" }} />
              Waiting for payment confirmation…
            </div>
            <button
              onClick={() => onRefresh()}
              className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> I've paid — check again
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={handleBuy}
              disabled={buying}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-extrabold transition-all hover:brightness-110 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #3D7CFF, #B025FF)", color: "#FFFFFF" }}
            >
              {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
              {price != null ? `Unlock for $${Number(price).toFixed(2)}` : "Unlock stream"}
            </button>
            <p className="text-[11px] text-white/30 mt-3">
              🔒 Secure checkout powered by Stripe · Includes the full replay
            </p>
            {user && (
              <button
                onClick={() => onRefresh()}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Already purchased? Check access
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
