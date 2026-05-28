import { useEffect, useRef, useState } from "react";
import { Loader2, Download } from "lucide-react";
import { useAccess } from "@/hooks/useAccess";
import { useTrackPlayback } from "../hooks/useTrackPlayback";
import LockedTrackUnlock from "./LockedTrackUnlock";

interface Track {
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
 * Drop-in player for a (possibly locked) track.
 * - Locked + no access  → renders preview + unlock CTAs (LockedTrackUnlock).
 * - Has access (or unlocked) → resolves a signed URL via get-track-playback
 *   and renders the full-file <audio> element. Optional download button.
 */
export default function LockedTrackPlayer({ track }: { track: Track }) {
  const { hasAccess, isLoading: accessLoading } = useAccess("track", track.id);
  const resolve = useTrackPlayback();
  const [url, setUrl] = useState<string | null>(null);
  const [allowDownload, setAllowDownload] = useState(false);
  const fetchedRef = useRef(false);

  const unlocked = !track.is_locked || hasAccess;

  useEffect(() => {
    if (!unlocked || fetchedRef.current) return;
    fetchedRef.current = true;
    resolve.mutate(track.id, {
      onSuccess: (data) => {
        if (data?.access === "full") {
          setUrl(data.playback_url ?? null);
          setAllowDownload(!!data.allow_download);
        }
      },
    });
  }, [unlocked, track.id]);

  if (track.is_locked && !hasAccess) {
    return <LockedTrackUnlock track={track} />;
  }

  if (accessLoading || resolve.isPending || !url) {
    return (
      <div className="flex items-center gap-2 text-white/60 text-sm p-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading playback…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <audio controls src={url} className="w-full" />
      {allowDownload && (
        <a
          href={url}
          download
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-white/10 hover:bg-white/15 text-white"
        >
          <Download className="w-4 h-4" /> Download
        </a>
      )}
    </div>
  );
}
