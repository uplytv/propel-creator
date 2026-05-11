import { useEffect, useState } from "react";
import {
  RELEASE_STATUSES,
  ReleaseStatus,
  DSP_LABELS,
  useUpdateReleaseStatus,
  DistributionTarget,
} from "../hooks/useDistribution";
import { useToast } from "@/hooks/use-toast";

interface Props {
  releaseId: string;
  platform: string;
  target?: DistributionTarget;
  compact?: boolean;
}

const URL_PLACEHOLDER: Record<string, string> = {
  spotify: "Paste Spotify track URL",
  apple_music: "Paste Apple Music URL",
  amazon_music: "Paste Amazon Music URL",
  youtube_music: "Paste YouTube Music URL",
  tidal: "Paste Tidal URL",
  deezer: "Paste Deezer URL",
  soundcloud: "Paste SoundCloud URL",
};

export default function ReleaseStatusRow({ releaseId, platform, target, compact }: Props) {
  const update = useUpdateReleaseStatus();
  const { toast } = useToast();
  const [status, setStatus] = useState<ReleaseStatus>(target?.status ?? "not_submitted");
  const [liveUrl, setLiveUrl] = useState(target?.live_url ?? "");
  const [notes, setNotes] = useState(target?.notes ?? "");

  useEffect(() => {
    setStatus(target?.status ?? "not_submitted");
    setLiveUrl(target?.live_url ?? "");
    setNotes(target?.notes ?? "");
  }, [target?.id, target?.status, target?.live_url, target?.notes]);

  const persist = async (overrides?: Partial<{ status: ReleaseStatus; liveUrl: string; notes: string }>) => {
    try {
      await update.mutateAsync({
        releaseId,
        platform,
        status: overrides?.status ?? status,
        liveUrl: overrides?.liveUrl ?? liveUrl,
        notes: overrides?.notes ?? notes,
      });
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    }
  };

  const handleStatus = (next: ReleaseStatus) => {
    setStatus(next);
    persist({ status: next });
  };

  return (
    <div className={`rounded-lg bg-white/5 p-3 space-y-2 ${compact ? "" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-white text-sm font-medium">{DSP_LABELS[platform] ?? platform}</span>
        <select
          value={status}
          onChange={(e) => handleStatus(e.target.value as ReleaseStatus)}
          className="bg-white/10 text-white rounded-md px-2 py-1.5 text-xs border border-white/10"
          style={{ minHeight: 36 }}
        >
          {RELEASE_STATUSES.map((s) => (
            <option key={s.value} value={s.value} className="bg-black">
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {status === "live" && (
        <input
          type="url"
          value={liveUrl}
          onChange={(e) => setLiveUrl(e.target.value)}
          onBlur={() => persist()}
          placeholder={URL_PLACEHOLDER[platform] ?? "Paste live URL"}
          className="w-full bg-white/5 text-white rounded-md px-3 py-2 border border-white/10 placeholder:text-white/30"
          style={{ fontSize: 16, minHeight: 44 }}
        />
      )}

      <input
        type="text"
        value={notes}
        maxLength={280}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => persist()}
        placeholder="Notes (optional)"
        className="w-full bg-white/5 text-white/80 rounded-md px-3 py-2 border border-white/10 placeholder:text-white/30 text-xs"
        style={{ fontSize: 14 }}
      />
    </div>
  );
}
