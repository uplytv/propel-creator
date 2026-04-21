import { useState } from "react";
import { useMyPlaylists, useCreatePlaylist, useAddVideoToPlaylist } from "@/hooks/usePlaylists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ListPlus, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  videoId: string;
  variant?: "icon" | "button";
}

export default function AddToPlaylistButton({ videoId, variant = "button" }: Props) {
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const { data: playlists, isLoading } = useMyPlaylists();
  const create = useCreatePlaylist();
  const add = useAddVideoToPlaylist();

  const handleAdd = async (playlistId: string, title: string) => {
    try {
      await add.mutateAsync({ playlistId, videoId });
      toast.success(`Added to "${title}"`);
      setOpen(false);
    } catch (e: any) {
      if (e?.code === "23505") {
        toast.message("Already in this playlist");
      } else {
        toast.error("Could not add to playlist");
      }
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const pl = await create.mutateAsync({ title: newTitle.trim() });
    setNewTitle("");
    await handleAdd(pl.id, pl.title);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "icon" ? (
          <Button variant="ghost" size="icon" aria-label="Add to playlist">
            <ListPlus className="w-5 h-5" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5">
            <ListPlus className="w-4 h-4" /> Save
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 space-y-3">
        <p className="text-sm font-semibold text-foreground">Save to playlist</p>

        <div className="max-h-60 overflow-y-auto space-y-1">
          {isLoading && (
            <div className="flex justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {(playlists ?? []).map((p) => (
            <button
              key={p.id}
              onClick={() => handleAdd(p.id, p.title)}
              className="w-full text-left px-2 py-1.5 rounded-md hover:bg-secondary/60 transition-colors"
            >
              <p className="text-sm text-foreground truncate">{p.title}</p>
              <p className="text-[11px] text-muted-foreground">{p.item_count} videos</p>
            </button>
          ))}
          {playlists && playlists.length === 0 && !isLoading && (
            <p className="text-xs text-muted-foreground text-center py-2">No playlists yet.</p>
          )}
        </div>

        <div className="flex gap-2 border-t border-border pt-2">
          <Input
            placeholder="New playlist name"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={handleCreate} disabled={!newTitle.trim() || create.isPending}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
