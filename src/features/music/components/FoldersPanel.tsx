import { useState } from "react";
import { Folder, FolderPlus, Trash2 } from "lucide-react";
import {
  usePlaylistFolders,
  useCreateFolder,
  useDeleteFolder,
} from "../hooks/usePlaylistFolders";
import { useUserPlaylists } from "../hooks/useTrack";
import { useAuth } from "@/context/AuthContext";
import PlaylistCard from "./PlaylistCard";

export default function FoldersPanel() {
  const { user } = useAuth();
  const { data: folders } = usePlaylistFolders();
  const { data: playlists } = useUserPlaylists(user?.id);
  const create = useCreateFolder();
  const remove = useDeleteFolder();
  const [name, setName] = useState("");

  const grouped = (folders ?? []).map((f) => ({
    folder: f,
    items: (playlists ?? []).filter((p: any) => p.folder_id === f.id),
  }));
  const unfiled = (playlists ?? []).filter((p: any) => !p.folder_id);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            create.mutate(name.trim());
            setName("");
          }
        }}
        className="flex items-center gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New folder name"
          className="flex-1 bg-white/5 text-white text-base placeholder:text-white/30 rounded-full px-4 py-2.5 outline-none border border-transparent focus:border-white/20"
          style={{ fontSize: 16 }}
        />
        <button
          type="submit"
          disabled={!name.trim() || create.isPending}
          className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold disabled:opacity-50"
          style={{ background: "#3D7CFF", color: "#000" }}
        >
          <FolderPlus className="w-3.5 h-3.5" /> Add
        </button>
      </form>

      {grouped.map(({ folder, items }) => (
        <div key={folder.id} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4" style={{ color: folder.color }} />
              <h3 className="text-white font-semibold text-sm">{folder.name}</h3>
              <span className="text-white/40 text-xs">{items.length}</span>
            </div>
            <button
              onClick={() => remove.mutate(folder.id)}
              aria-label="Delete folder"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-white/40 hover:text-white"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {items.map((p: any) => <PlaylistCard key={p.id} playlist={p} />)}
            {!items.length && (
              <p className="text-xs text-white/40">Drop playlists here from "Unfiled".</p>
            )}
          </div>
        </div>
      ))}

      {unfiled.length > 0 && (
        <div>
          <h3 className="text-white/60 text-xs font-bold uppercase tracking-wide mb-2">Unfiled</h3>
          <div className="flex flex-wrap gap-3">
            {unfiled.map((p: any) => <PlaylistCard key={p.id} playlist={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}
