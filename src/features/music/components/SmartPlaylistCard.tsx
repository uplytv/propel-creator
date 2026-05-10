import { Link } from "react-router-dom";
import { Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SmartPlaylist } from "../hooks/useSmartPlaylists";
import { useDeleteSmartPlaylist } from "../hooks/useSmartPlaylists";

const RULE_LABEL: Record<string, string> = {
  liked: "Liked songs",
  recently_played: "Recently played",
  top_played: "Top played",
  genre: "By genre",
  artist: "By artist",
};

export function SmartPlaylistCard({ playlist }: { playlist: SmartPlaylist }) {
  const del = useDeleteSmartPlaylist();
  return (
    <div className="relative rounded-xl bg-card/40 border border-border/30 overflow-hidden">
      <Link to={`/music/smart-playlist/${playlist.id}`} className="block">
        <div
          className="aspect-square w-full"
          style={{
            background: playlist.cover_art_url
              ? `url(${playlist.cover_art_url}) center/cover`
              : "linear-gradient(135deg, hsl(var(--primary)/0.6), hsl(var(--accent)/0.6))",
          }}
        >
          <div className="w-full h-full flex items-end p-3 bg-gradient-to-t from-black/60 to-transparent">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="p-3">
          <div className="text-sm font-semibold truncate">{playlist.title}</div>
          <div className="text-xs text-muted-foreground">{RULE_LABEL[playlist.rule_type] ?? playlist.rule_type}</div>
        </div>
      </Link>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 h-8 w-8 bg-black/40"
        onClick={() => del.mutate(playlist.id)}
        aria-label="Delete smart playlist"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
