import { useState } from "react";
import { Sparkles, Trash2, Plus } from "lucide-react";
import {
  useSmartPlaylists,
  useCreateSmartPlaylist,
  useDeleteSmartPlaylist,
  useSmartPlaylistTracks,
  type SmartRuleType,
} from "../hooks/useSmartPlaylists";
import TrackRow from "./TrackRow";

const RULE_PRESETS: { type: SmartRuleType; title: string; description: string }[] = [
  { type: "liked", title: "All Liked", description: "Every track you've liked" },
  { type: "recently_played", title: "Recently Played", description: "Your latest listens" },
  { type: "top_played", title: "Most Played", description: "Tracks on heavy rotation" },
];

function SmartPlaylistRow({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const { data: tracks } = useSmartPlaylistTracks(open ? id : undefined);
  const remove = useDeleteSmartPlaylist();

  return (
    <div className="rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
      <div className="flex items-center justify-between p-3">
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 flex-1 text-left">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(61, 124, 255,0.15)" }}
          >
            <Sparkles className="w-5 h-5" style={{ color: "#3D7CFF" }} />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{title}</p>
            <p className="text-white/40 text-xs">Smart playlist</p>
          </div>
        </button>
        <button
          onClick={() => remove.mutate(id)}
          aria-label="Delete smart playlist"
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-white/40 hover:text-white"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {open && tracks && (
        <div className="px-3 pb-3 space-y-1">
          {tracks.map((t, i) => (
            <TrackRow key={t.id} track={t} queue={tracks} index={i} />
          ))}
          {!tracks.length && <p className="text-xs text-white/40 px-2 py-3">No tracks match yet.</p>}
        </div>
      )}
    </div>
  );
}

export default function SmartPlaylistsPanel() {
  const { data: playlists } = useSmartPlaylists();
  const create = useCreateSmartPlaylist();

  const existingTypes = new Set((playlists ?? []).map((p) => p.rule_type));
  const available = RULE_PRESETS.filter((p) => !existingTypes.has(p.type));

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {(playlists ?? []).map((p) => (
          <SmartPlaylistRow key={p.id} id={p.id} title={p.title} />
        ))}
        {!playlists?.length && (
          <p className="text-sm text-white/40">
            Smart playlists update automatically based on your listening.
          </p>
        )}
      </div>

      {available.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {available.map((preset) => (
            <button
              key={preset.type}
              onClick={() =>
                create.mutate({ title: preset.title, rule_type: preset.type })
              }
              className="min-h-[44px] inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold text-white"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <Plus className="w-3.5 h-3.5" />
              {preset.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
