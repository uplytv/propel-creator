import { useNavigate, useParams } from "react-router-dom";
import { usePlaylist, usePlaylistItems, useRemoveVideoFromPlaylist } from "@/hooks/usePlaylists";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Trash2, Loader2, ListVideo } from "lucide-react";
import SEOHead from "@/components/SEOHead";

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: playlist } = usePlaylist(id);
  const { data: items, isLoading } = usePlaylistItems(id);
  const remove = useRemoveVideoFromPlaylist(id);

  const isOwner = user?.id === playlist?.creator_id;

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEOHead
        title={`${playlist?.title ?? "Playlist"} — UPLY`}
        description={playlist?.description || "A video playlist on UPLY"}
      />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <button
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <header className="flex items-start gap-3">
          <ListVideo className="w-6 h-6 text-primary mt-1" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground">{playlist?.title ?? "Playlist"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {playlist?.item_count ?? 0} videos
            </p>
          </div>
          {items && items.length > 0 && items[0]?.videos && (
            <Button
              onClick={() => {
                const first: any = items[0].videos;
                const path = first.slug ? `/v/${first.slug}?playlist=${id}` : `/v/${first.id}?playlist=${id}`;
                navigate(path);
              }}
              className="gap-1.5"
            >
              <Play className="w-4 h-4" /> Play all
            </Button>
          )}
        </header>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        <ul className="space-y-2">
          {(items ?? []).map((it: any, i) => {
            const v = it.videos;
            if (!v) return null;
            return (
              <li
                key={it.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 hover:border-primary/40 transition-colors"
              >
                <span className="text-xs font-mono text-muted-foreground w-6 text-center">{i + 1}</span>
                <button
                  onClick={() =>
                    navigate(v.slug ? `/v/${v.slug}?playlist=${id}` : `/v/${v.id}?playlist=${id}`)
                  }
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt={v.title || ""} className="w-24 h-14 object-cover rounded-md shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-24 h-14 bg-secondary rounded-md flex items-center justify-center shrink-0">
                      <Play className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{v.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(v.view_count ?? 0).toLocaleString()} views
                    </p>
                  </div>
                </button>
                {isOwner && (
                  <button
                    onClick={() => remove.mutate(it.id)}
                    className="text-muted-foreground hover:text-destructive p-1.5"
                    aria-label="Remove from playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {items && items.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground text-center py-8">
            This playlist is empty. Add videos using the "Save" button on any video page.
          </p>
        )}
      </div>
    </div>
  );
}
