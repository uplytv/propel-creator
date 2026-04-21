import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Eye, Play, Rocket } from "lucide-react";
import LiveBadge from "./LiveBadge";
import { useLiveViewerCount } from "@/hooks/useLiveViewerCount";
import type { DiscoveryItem } from "@/hooks/useDiscoveryAlgorithmFeed";

// Module-level dedupe so the same boost doesn't toast twice across re-mounts/cards.
const notifiedEndingBoosts = new Set<string>();
const notifiedEndedBoosts = new Set<string>();
// Module-level dedupe so we only invalidate the discovery feed ONCE per boost expiry,
// even when multiple cards (same boost surfaced in different feeds) fire simultaneously.
const invalidatedBoostExpiries = new Set<string>();
function invalidateBoostFeedOnce(key: string, run: () => void) {
  if (invalidatedBoostExpiries.has(key)) return;
  invalidatedBoostExpiries.add(key);
  run();
}

/** Re-renders the consumer once per minute, aligned to wall-clock minute. */
function useMinuteTick(enabled: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    let interval: ReturnType<typeof setInterval> | null = null;
    const timeout = setTimeout(() => {
      setTick((t) => t + 1);
      interval = setInterval(() => setTick((t) => t + 1), 60_000);
    }, msToNextMinute);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [enabled]);
}

function linkFor(item: DiscoveryItem) {
  const slug = item.slug || item.content_id;
  switch (item.content_type) {
    case "video": return `/videos/${slug}`;
    case "clip": return `/clips/${slug}`;
    case "stream": return `/stream/${slug}`;
    case "recording": return `/stream/${slug}?type=recording`;
    case "post": return `/community/${item.creator_id}?post=${item.content_id}`;
    case "product": return `/products/${item.content_id}`;
    case "podcast": return `/podcast?episode=${item.content_id}`;
    case "event": return `/events/global/${item.content_id}`;
    default: return `/stream/${slug}`;
  }
}

function formatBoostRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "ending";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m left`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

export default function DiscoveryFeedCard({ item }: { item: DiscoveryItem }) {
  const queryClient = useQueryClient();
  // Subscribe to live viewer count only when the item is a live stream
  const isStream = item.content_type === "stream" && item.is_live;
  const { count: liveCount } = useLiveViewerCount(isStream ? item.content_id : null, item.views);
  // Tick once per minute while a boost countdown is showing.
  useMinuteTick(!!item.is_boosted && !!item.boost_expires_at);

  // Toast when a visible boost crosses into the "ending" window (≤ 5 min) or fully ends.
  const lastStateRef = useRef<"active" | "ending" | "ended" | null>(null);
  useEffect(() => {
    if (!item.is_boosted || !item.boost_expires_at) return;
    const ms = new Date(item.boost_expires_at).getTime() - Date.now();
    const state: "active" | "ending" | "ended" = ms <= 0 ? "ended" : ms <= 5 * 60_000 ? "ending" : "active";
    const prev = lastStateRef.current;
    lastStateRef.current = state;
    // Only fire on transition (not on first mount when already past).
    if (prev === null) return;
    const key = `${item.content_type}:${item.content_id}:${item.boost_expires_at}`;
    if (state === "ending" && prev === "active" && !notifiedEndingBoosts.has(key)) {
      notifiedEndingBoosts.add(key);
      toast(`Boost ending soon: ${item.title ?? "Promoted item"}`, {
        description: "Less than 5 minutes left in the promoted slot.",
      });
    } else if (state === "ended" && prev !== "ended" && !notifiedEndedBoosts.has(key)) {
      notifiedEndedBoosts.add(key);
      toast(`Boost ended: ${item.title ?? "Promoted item"}`, {
        description: "This promotion is no longer active.",
      });
      // Re-rank the discovery feed immediately so non-boosted items flow upward.
      queryClient.invalidateQueries({ queryKey: ["discovery-feed"] });
      queryClient.invalidateQueries({ queryKey: ["active-boosts"] });
    }
  });

  // Schedule a precise refetch at the exact expiry moment (in case the minute
  // tick lands a few seconds early/late and to handle boosts > 1 minute away).
  useEffect(() => {
    if (!item.is_boosted || !item.boost_expires_at) return;
    const ms = new Date(item.boost_expires_at).getTime() - Date.now();
    if (ms <= 0 || ms > 24 * 60 * 60_000) return; // skip if already past or > 1 day away
    const t = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["discovery-feed"] });
      queryClient.invalidateQueries({ queryKey: ["active-boosts"] });
    }, ms + 250);
    return () => clearTimeout(t);
  }, [item.is_boosted, item.boost_expires_at, queryClient]);

  return (
    <Link to={linkFor(item)} className="group block space-y-2">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt={item.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground"><Play className="w-8 h-8" /></div>
        )}

        {isStream && (
          <LiveBadge count={liveCount} className="absolute top-2 left-2" />
        )}
        {!isStream && item.is_boosted && (
          <Badge
            className="absolute top-2 left-2 bg-primary text-primary-foreground gap-1 shadow-lg"
            title={item.boost_expires_at ? `Boost ends ${new Date(item.boost_expires_at).toLocaleString()}` : undefined}
          >
            <Rocket className="w-3 h-3" />
            <span>Promoted</span>
            {item.boost_expires_at && (
              <span className="opacity-80 font-normal">· {formatBoostRemaining(item.boost_expires_at)}</span>
            )}
          </Badge>
        )}
        {!isStream && !item.is_boosted && item.is_new_creator_boosted && (
          <Badge className="absolute top-2 left-2 bg-primary/90 backdrop-blur-sm gap-1">
            <Sparkles className="w-3 h-3" /> Rising
          </Badge>
        )}
        {item.duration_seconds ? (
          <span className="absolute bottom-2 right-2 text-xs bg-black/70 text-white px-1.5 py-0.5 rounded">
            {Math.floor(item.duration_seconds / 60)}:{String(item.duration_seconds % 60).padStart(2, "0")}
          </span>
        ) : null}
      </div>
      <div className="flex gap-2.5">
        <Avatar className="w-8 h-8">
          <AvatarImage src={item.creator?.avatar_url ?? undefined} />
          <AvatarFallback>{item.creator?.display_name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary">{item.title}</h3>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {item.creator?.display_name ?? "Creator"} · <Eye className="inline w-3 h-3" />{" "}
            {(isStream ? liveCount : item.views).toLocaleString()}
            {isStream ? " watching" : ""}
          </div>
        </div>
      </div>
    </Link>
  );
}
