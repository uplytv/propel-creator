import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSmartPlaylists, useSmartPlaylistTracks } from "../hooks/useSmartPlaylists";
import { formatDuration } from "../lib/formatDuration";

export default function SmartPlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: all = [] } = useSmartPlaylists();
  const playlist = all.find((p) => p.id === id);
  const { data: tracks = [], isLoading } = useSmartPlaylistTracks(id);

  return (
    <div className="mobile-safe-content px-4 pt-4">
      <Link to="/music/smart-playlists" className="inline-flex items-center text-sm text-muted-foreground mb-3">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <div
          className="h-28 w-28 rounded-xl flex items-center justify-center"
          style={{
            background: playlist?.cover_art_url
              ? `url(${playlist.cover_art_url}) center/cover`
              : "linear-gradient(135deg, hsl(var(--primary)/0.6), hsl(var(--accent)/0.6))",
          }}
        >
          <Sparkles className="h-8 w-8 text-primary-foreground" />
        </div>
        <div>
          <div className="text-xs uppercase text-muted-foreground">Smart playlist</div>
          <h1 className="text-2xl font-display font-bold">{playlist?.title ?? "Loading..."}</h1>
          <div className="text-xs text-muted-foreground">{tracks.length} tracks · auto-updating</div>
        </div>
      </div>

      <Button className="mb-4" size="sm" disabled={!tracks.length}>
        <Play className="h-4 w-4 mr-1" /> Play all
      </Button>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading tracks...</div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No tracks match this rule yet.
        </div>
      ) : (
        <ul className="divide-y divide-border/30">
          {tracks.map((t, i) => (
            <li key={t.id} className="flex items-center py-3 gap-3">
              <span className="w-6 text-xs text-muted-foreground text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.title}</div>
                <div className="text-xs text-muted-foreground truncate">{t.genre ?? ""}</div>
              </div>
              <span className="text-xs text-muted-foreground">
                {t.duration_seconds ? formatDuration(t.duration_seconds) : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
