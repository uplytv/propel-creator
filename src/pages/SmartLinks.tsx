import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Music, ExternalLink, BarChart3, Trash2, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/slugs";
import SmartLinkAnalytics from "@/components/smartlinks/SmartLinkAnalytics";

interface SmartLink {
  id: string;
  slug: string;
  link_type: string;
  title: string;
  artist: string | null;
  description: string | null;
  cover_image_url: string | null;
  platforms: Record<string, string>;
  release_date: string | null;
  is_presave: boolean;
  capture_email: boolean;
  click_count: number;
  created_at: string;
}

const PLATFORMS = [
  { key: "spotify", label: "Spotify URL" },
  { key: "apple_music", label: "Apple Music URL" },
  { key: "youtube", label: "YouTube URL" },
  { key: "youtube_music", label: "YouTube Music URL" },
  { key: "tidal", label: "Tidal URL" },
  { key: "amazon_music", label: "Amazon Music URL" },
  { key: "soundcloud", label: "SoundCloud URL" },
  { key: "deezer", label: "Deezer URL" },
  { key: "bandcamp", label: "Bandcamp URL" },
];

export default function SmartLinks() {
  const { user } = useAuth();
  const [links, setLinks] = useState<SmartLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SmartLink | null>(null);
  const [analyticsLinkId, setAnalyticsLinkId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    artist: "",
    description: "",
    slug: "",
    link_type: "music" as string,
    is_presave: false,
    capture_email: false,
    release_date: "",
    cover_image_url: "",
    platforms: {} as Record<string, string>,
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadLinks = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("smart_links")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });
    setLinks((data || []) as unknown as SmartLink[]);
    setLoading(false);
  };

  useEffect(() => {
    loadLinks();
  }, [user]);

  const resetForm = () => {
    setForm({
      title: "",
      artist: "",
      description: "",
      slug: "",
      link_type: "music",
      is_presave: false,
      capture_email: false,
      release_date: "",
      cover_image_url: "",
      platforms: {},
    });
    setCoverFile(null);
    setEditing(null);
  };

  const openNew = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (link: SmartLink) => {
    setEditing(link);
    setForm({
      title: link.title,
      artist: link.artist || "",
      description: link.description || "",
      slug: link.slug,
      link_type: link.link_type,
      is_presave: link.is_presave,
      capture_email: link.capture_email,
      release_date: link.release_date ? link.release_date.slice(0, 16) : "",
      cover_image_url: link.cover_image_url || "",
      platforms: link.platforms || {},
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      let coverUrl = form.cover_image_url;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("smart-links")
          .upload(path, coverFile, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        coverUrl = supabase.storage.from("smart-links").getPublicUrl(path).data.publicUrl;
      }

      const baseSlug = form.slug.trim() || slugify(form.title);
      const finalSlug = editing
        ? baseSlug
        : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

      const payload = {
        creator_id: user.id,
        slug: finalSlug,
        link_type: form.link_type,
        title: form.title.trim(),
        artist: form.artist.trim() || null,
        description: form.description.trim() || null,
        cover_image_url: coverUrl || null,
        platforms: form.platforms,
        release_date: form.release_date ? new Date(form.release_date).toISOString() : null,
        is_presave: form.is_presave,
        capture_email: form.capture_email,
      };

      if (editing) {
        const { error } = await supabase.from("smart_links").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("SmartLink updated");
      } else {
        const { error } = await supabase.from("smart_links").insert(payload);
        if (error) throw error;
        toast.success("SmartLink created");
      }
      setOpen(false);
      resetForm();
      loadLinks();
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this SmartLink? This cannot be undone.")) return;
    const { error } = await supabase.from("smart_links").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Deleted");
      loadLinks();
    }
  };

  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/link/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return (
    <div className="min-h-screen bg-background mobile-safe-content">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              SmartLinks
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              One link. Every platform. Track every click.
            </p>
          </div>
          <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <SheetTrigger asChild>
              <Button onClick={openNew} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" />
                New Link
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{editing ? "Edit SmartLink" : "Create SmartLink"}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <div>
                  <Label>Type</Label>
                  <Select value={form.link_type} onValueChange={(v) => setForm({ ...form, link_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="music">🎵 Music</SelectItem>
                      <SelectItem value="event">📅 Event</SelectItem>
                      <SelectItem value="podcast">🎙 Podcast</SelectItem>
                      <SelectItem value="product">🛍 Product</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })}
                    placeholder="Song or release name"
                    style={{ fontSize: "16px" }}
                  />
                </div>

                <div>
                  <Label>Artist / Creator</Label>
                  <Input value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} style={{ fontSize: "16px" }} />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} style={{ fontSize: "16px" }} />
                </div>

                <div>
                  <Label>Custom slug (URL)</Label>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground">/link/</span>
                    <Input
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                      placeholder="my-new-song"
                      style={{ fontSize: "16px" }}
                    />
                  </div>
                </div>

                <div>
                  <Label>Cover image</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                  />
                  {form.cover_image_url && !coverFile && (
                    <img src={form.cover_image_url} alt="" className="mt-2 w-24 h-24 rounded object-cover" />
                  )}
                </div>

                <div className="space-y-3 border-t pt-4">
                  <Label className="text-base">Platform URLs</Label>
                  {PLATFORMS.map((p) => (
                    <div key={p.key}>
                      <Label className="text-xs text-muted-foreground">{p.label}</Label>
                      <Input
                        value={form.platforms[p.key] || ""}
                        onChange={(e) => setForm({
                          ...form,
                          platforms: { ...form.platforms, [p.key]: e.target.value },
                        })}
                        placeholder={`https://...`}
                        style={{ fontSize: "16px" }}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Pre-save mode</Label>
                      <p className="text-xs text-muted-foreground">Fans pre-save before release</p>
                    </div>
                    <Switch checked={form.is_presave} onCheckedChange={(v) => setForm({ ...form, is_presave: v })} />
                  </div>

                  {form.is_presave && (
                    <div>
                      <Label>Release date</Label>
                      <Input
                        type="datetime-local"
                        value={form.release_date}
                        onChange={(e) => setForm({ ...form, release_date: e.target.value })}
                        style={{ fontSize: "16px" }}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Capture emails</Label>
                      <p className="text-xs text-muted-foreground">Require email before redirect</p>
                    </div>
                    <Switch checked={form.capture_email} onCheckedChange={(v) => setForm({ ...form, capture_email: v })} />
                  </div>
                </div>

                <Button onClick={handleSubmit} disabled={submitting} className="w-full min-h-[44px]">
                  {submitting ? "Saving..." : editing ? "Save changes" : "Create SmartLink"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : links.length === 0 ? (
          <Card className="p-12 text-center">
            <Music className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-1">No SmartLinks yet</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first link in seconds. Replaces ToneDen, Feature.fm, Linkfire.
            </p>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Create one</Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <Card key={link.id} className="p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded bg-muted overflow-hidden flex-shrink-0">
                  {link.cover_image_url ? (
                    <img src={link.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Music className="h-6 w-6 text-muted-foreground" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{link.title}</h3>
                    {link.is_presave && (
                      <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded">Pre-save</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">/link/{link.slug}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {link.click_count} clicks · {Object.keys(link.platforms || {}).filter(k => link.platforms[k]).length} platforms
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => copyUrl(link.slug)} title="Copy link">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" asChild title="Open">
                    <Link to={`/link/${link.slug}`} target="_blank"><ExternalLink className="h-4 w-4" /></Link>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setAnalyticsLinkId(link.id)} title="Analytics">
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(link)} title="Edit">
                    <Sparkles className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(link.id)} title="Delete">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Analytics drawer */}
        <Sheet open={!!analyticsLinkId} onOpenChange={(o) => !o && setAnalyticsLinkId(null)}>
          <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>SmartLink Analytics</SheetTitle>
            </SheetHeader>
            {analyticsLinkId && <SmartLinkAnalytics linkId={analyticsLinkId} />}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
