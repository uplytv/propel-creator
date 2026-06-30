import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save, ArrowLeft } from "lucide-react";

import { ARTIST_ROSTER } from "@/data/artistRoster";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { slugify } from "@/lib/slugs";

interface DbPost {
  id: string;
  artist_slug: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tag: string | null;
  read_time: string;
  published: boolean;
  published_at: string;
}

const empty = {
  id: "",
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  tag: "",
  read_time: "3 min read",
  published: true,
  published_at: new Date().toISOString(),
};

export default function ArtistBlogManagePage() {
  const { slug = "" } = useParams();
  const { session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const artist = ARTIST_ROSTER.find(
    (a) => a.slug === slug || (a.aliases ?? []).includes(slug),
  );

  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is-admin", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role" as any, {
        _user_id: session!.user.id,
        _role: "admin",
      });
      return !!data;
    },
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["artist-blog-posts", artist?.slug],
    enabled: !!artist && !!isAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("artist_blog_posts")
        .select("*")
        .eq("artist_slug", artist!.slug)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data || []) as DbPost[];
    },
  });

  const [editing, setEditing] = useState<typeof empty>(empty);

  useEffect(() => {
    if (artist) document.title = `Edit blog — ${artist.displayName} · UPLY`;
  }, [artist]);

  const upsert = useMutation({
    mutationFn: async (p: typeof empty) => {
      const payload: any = {
        artist_slug: artist!.slug,
        slug: p.slug || slugify(p.title),
        title: p.title.trim(),
        excerpt: p.excerpt.trim(),
        body: p.body,
        tag: p.tag.trim() || null,
        read_time: p.read_time.trim() || "3 min read",
        published: p.published,
        published_at: p.published_at || new Date().toISOString(),
      };
      if (p.id) payload.id = p.id;
      else payload.created_by = session!.user.id;

      const { error } = await (supabase as any)
        .from("artist_blog_posts")
        .upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post saved");
      setEditing(empty);
      queryClient.invalidateQueries({ queryKey: ["artist-blog-posts", artist?.slug] });
      queryClient.invalidateQueries({ queryKey: ["artist-blog-posts-public", artist?.slug] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("artist_blog_posts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted");
      queryClient.invalidateQueries({ queryKey: ["artist-blog-posts", artist?.slug] });
      queryClient.invalidateQueries({ queryKey: ["artist-blog-posts-public", artist?.slug] });
    },
  });

  if (!artist) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="text-center">
          <p className="opacity-60">Artist not found.</p>
          <Link to="/" className="underline mt-2 inline-block">Back to UPLY</Link>
        </div>
      </main>
    );
  }

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin opacity-60" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to={`/${artist.slug}/blog`} replace />;

  const handleSave = () => {
    if (!editing.title.trim()) return toast.error("Title is required");
    upsert.mutate(editing);
  };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0A0A0A]/95 backdrop-blur z-10">
        <Link
          to={`/${artist.slug}/blog`}
          className="flex items-center gap-2 text-sm opacity-70 hover:opacity-100"
        >
          <ArrowLeft className="w-4 h-4" /> Back to blog
        </Link>
        <h1 className="text-sm uppercase tracking-[0.2em] opacity-80">
          {artist.displayName} · Editor
        </h1>
        <div className="w-24" />
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        {/* Editor */}
        <section className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {editing.id ? "Edit post" : "New post"}
            </h2>
            {editing.id && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(empty)}>
                <Plus className="w-4 h-4 mr-1" /> New
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="Post title"
              className="bg-black/40 border-white/10"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>URL slug (optional)</Label>
              <Input
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                placeholder="auto from title"
                className="bg-black/40 border-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tag</Label>
              <Input
                value={editing.tag}
                onChange={(e) => setEditing({ ...editing, tag: e.target.value })}
                placeholder="Feature, Notes, …"
                className="bg-black/40 border-white/10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Excerpt</Label>
            <Textarea
              value={editing.excerpt}
              onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
              rows={2}
              className="bg-black/40 border-white/10"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Body (use blank lines for new paragraphs)</Label>
            <Textarea
              value={editing.body}
              onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              rows={14}
              className="bg-black/40 border-white/10 font-mono text-[14px] leading-relaxed"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-1.5">
              <Label>Read time</Label>
              <Input
                value={editing.read_time}
                onChange={(e) => setEditing({ ...editing, read_time: e.target.value })}
                className="bg-black/40 border-white/10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Publish date</Label>
              <Input
                type="date"
                value={editing.published_at.slice(0, 10)}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    published_at: new Date(e.target.value).toISOString(),
                  })
                }
                className="bg-black/40 border-white/10"
              />
            </div>
            <div className="flex items-center gap-3 pb-2">
              <Switch
                checked={editing.published}
                onCheckedChange={(v) => setEditing({ ...editing, published: v })}
              />
              <span className="text-sm opacity-80">
                {editing.published ? "Published" : "Draft"}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={upsert.isPending}
              style={{ background: artist.accent, color: "#000" }}
            >
              {upsert.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {editing.id ? "Update post" : "Publish post"}
            </Button>
          </div>
        </section>

        {/* Sidebar list */}
        <aside className="space-y-3">
          <h3 className="text-xs uppercase tracking-[0.2em] opacity-60">
            All posts ({posts.length})
          </h3>
          {isLoading && <p className="opacity-60 text-sm">Loading…</p>}
          {!isLoading && posts.length === 0 && (
            <p className="opacity-60 text-sm">No posts yet — write your first one.</p>
          )}
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {posts.map((p) => (
              <div
                key={p.id}
                className={`rounded-xl border p-3 transition-colors ${
                  editing.id === p.id
                    ? "bg-white/10 border-white/30"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                <button
                  onClick={() =>
                    setEditing({
                      id: p.id,
                      slug: p.slug,
                      title: p.title,
                      excerpt: p.excerpt,
                      body: p.body,
                      tag: p.tag ?? "",
                      read_time: p.read_time,
                      published: p.published,
                      published_at: p.published_at,
                    })
                  }
                  className="text-left w-full"
                >
                  <p className="text-sm font-semibold line-clamp-2">{p.title}</p>
                  <p className="text-[11px] opacity-60 mt-1">
                    {new Date(p.published_at).toLocaleDateString()} ·{" "}
                    {p.published ? "Published" : "Draft"}
                  </p>
                </button>
                <div className="flex gap-2 mt-2">
                  <Link
                    to={`/${artist.slug}/blog/${p.slug}`}
                    className="text-[11px] opacity-60 hover:opacity-100 underline"
                    target="_blank"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${p.title}"?`)) remove.mutate(p.id);
                    }}
                    className="text-[11px] text-red-400 hover:text-red-300 ml-auto inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
