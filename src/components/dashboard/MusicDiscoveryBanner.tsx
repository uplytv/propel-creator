import { useState } from "react";
import { Link } from "react-router-dom";
import { Music, X } from "lucide-react";

const KEY = "uply_music_banner_dismissed_v1";

export default function MusicDiscoveryBanner() {
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem(KEY) === "1"
  );
  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="px-4 md:px-8 pt-4">
      <div
        className="relative rounded-2xl border border-border p-4 flex items-center gap-3"
        style={{
          background:
            "linear-gradient(90deg, rgba(61,124,255,0.15), rgba(176,37,255,0.15))",
        }}
      >
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Music className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            🎵 New on UPLY — upload tracks, build a fanbase, distribute everywhere.
          </p>
          <Link
            to="/music"
            className="text-xs font-semibold text-foreground/90 underline underline-offset-2"
          >
            Try it →
          </Link>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
