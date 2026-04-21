import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMyPlaylists, useCreatePlaylist, useDeletePlaylist } from "@/hooks/usePlaylists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListVideo, Plus, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import SEOHead from "@/components/SEOHead";

export default function Playlists() {
  const navigate = useNavigate();
  const { data: playlists, isLoading } = useMyPlaylists();
  const create = useCreatePlaylist();
  const del = useDeletePlaylist();
  const [title, setTitle] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) return;
    await create.mutateAsync({ title: title.trim() });
    setTitle("");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEOHead
        title="Your Playlists — UPLY"
        description="Create and manage video playlists on UPLY."
      />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center gap-3">
          <ListVideo className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Your Playlists</h1>
        </header>

        <div className="flex gap-2">
          <Input
            placeholder="New playlist name…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={!title.trim() || create.isPending} className="gap-1">
            <Plus className="w-4 h-4" /> Create
          </Button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(playlists ?? []).map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors"
            >
              <button
                onClick={() => navigate(`/playlist/${p.id}`)}
                className="text-left w-full"
              >
                <h3 className="text-base font-semibold text-foreground line-clamp-1">{p.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <span>{p.item_count} videos</span>
                  <span aria-hidden>•</span>
                  <span className="flex items-center gap-1">
                    {p.is_public ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {p.is_public ? "Public" : "Private"}
                  </span>
                </p>
              </button>
              <div className="flex justify-end mt-3">
                <button
                  onClick={() => {
                    if (confirm(`Delete playlist "${p.title}"?`)) del.mutate(p.id);
                  }}
                  className="text-muted-foreground hover:text-destructive p-1.5"
                  aria-label="Delete playlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {playlists && playlists.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <ListVideo className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No playlists yet. Create your first one above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
