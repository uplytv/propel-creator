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
import { Plus, Music, ExternalLink, BarChart3, Trash2, Copy, Sparkles, Pencil, Globe, Lock, Gift, Mail, Zap } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/slugs";
import SmartLinkAnalytics from "@/components/smartlinks/SmartLinkAnalytics";
import SmartLinkShareHub from "@/components/smartlinks/SmartLinkShareHub";

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
    spotify_uri: "",
    platforms: {} as Record<string, string>,
    // Social unlock
    unlock_type: "none" as "none" | "spotify_follow" | "email" | "social_share",
    unlock_spotify_artist_id: "",
    unlock_reward_type: "download" as "download" | "content" | "discount",
    unlock_reward_url: "",
    unlock_reward_label: "",
    // Contest
    contest_enabled: false,
    contest_prize: "",
    contest_end_date: "",
    contest_winner_count: 1,
    // Distribution / extras
    itunes_affiliate_token: "",
    amazon_affiliate_tag: "",
    tiktok_sound_url: "",
    custom_domain: "",
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [editingVerification, setEditingVerification] = useState<{
    token: string | null;
    verified: boolean;
  }>({ token: null, verified: false });

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
      spotify_uri: "",
      platforms: {},
      unlock_type: "none",
      unlock_spotify_artist_id: "",
      unlock_reward_type: "download",
      unlock_reward_url: "",
      unlock_reward_label: "",
      contest_enabled: false,
      contest_prize: "",
      contest_end_date: "",
      contest_winner_count: 1,
      itunes_affiliate_token: "",
      amazon_affiliate_tag: "",
      tiktok_sound_url: "",
      custom_domain: "",
    });
    setCoverFile(null);
    setEditing(null);
    setEditingVerification({ token: null, verified: false });
  };

  const openNew = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (link: SmartLink) => {
    setEditing(link);
    const anyLink = link as any;
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
      spotify_uri: anyLink.spotify_uri || "",
      platforms: link.platforms || {},
      unlock_type: anyLink.unlock_type || "none",
      unlock_spotify_artist_id: anyLink.unlock_spotify_artist_id || "",
      unlock_reward_type: anyLink.unlock_reward_type || "download",
      unlock_reward_url: anyLink.unlock_reward_url || "",
      unlock_reward_label: anyLink.unlock_reward_label || "",
      contest_enabled: !!anyLink.contest_enabled,
      contest_prize: anyLink.contest_prize || "",
      contest_end_date: anyLink.contest_end_date ? String(anyLink.contest_end_date).slice(0, 16) : "",
      contest_winner_count: anyLink.contest_winner_count || 1,
      itunes_affiliate_token: anyLink.itunes_affiliate_token || "",
      amazon_affiliate_tag: anyLink.amazon_affiliate_tag || "",
      tiktok_sound_url: anyLink.tiktok_sound_url || "",
      custom_domain: anyLink.custom_domain || "",
    });
    setEditingVerification({
      token: anyLink.custom_domain_verification_token || null,
      verified: !!anyLink.custom_domain_verified,
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
        spotify_uri: form.spotify_uri.trim() || null,
        unlock_type: form.unlock_type,
        unlock_spotify_artist_id: form.unlock_spotify_artist_id.trim() || null,
        unlock_reward_type: form.unlock_reward_type,
        unlock_reward_url: form.unlock_reward_url.trim() || null,
        unlock_reward_label: form.unlock_reward_label.trim() || null,
        contest_enabled: form.contest_enabled,
        contest_prize: form.contest_prize.trim() || null,
        contest_end_date: form.contest_end_date ? new Date(form.contest_end_date).toISOString() : null,
        contest_winner_count: form.contest_winner_count,
        itunes_affiliate_token: form.itunes_affiliate_token.trim() || null,
        amazon_affiliate_tag: form.amazon_affiliate_tag.trim() || null,
        tiktok_sound_url: form.tiktok_sound_url.trim() || null,
        ...(() => {
          const newDomain = form.custom_domain.trim().toLowerCase() || null;
          const oldDomain = (editing as any)?.custom_domain || null;
          if (!newDomain) {
            return {
              custom_domain: null,
              custom_domain_verified: false,
              custom_domain_verification_token: null,
            };
          }
          if (newDomain !== oldDomain) {
            // New or changed domain → fresh token, reset verified
            const token =
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID().replace(/-/g, "")
                : Math.random().toString(36).slice(2) + Date.now().toString(36);
            return {
              custom_domain: newDomain,
              custom_domain_verified: false,
              custom_domain_verification_token: token,
            };
          }
          // Same domain — preserve token & verified state
          return { custom_domain: newDomain };
        })(),
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
      if (err?.code === "23505" || /unique/i.test(err?.message || "")) {
        toast.error("That URL slug is already taken", {
          description: "Try a different slug in the URL field.",
        });
      } else {
        toast.error(err.message || "Failed to save");
      }
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

  const handleVerifyDomain = async () => {
    if (!editing) {
      toast.error("Save the SmartLink first, then verify your domain");
      return;
    }
    if (!editingVerification.token) {
      toast.error("No verification token found — re-save the link");
      return;
    }
    setVerifyingDomain(true);
    try {
      const { data, error } = await supabase.functions.invoke("smartlink-verify-domain", {
        body: { link_id: editing.id },
      });
      if (error) throw error;
      if ((data as any)?.verified) {
        toast.success("Domain verified! 🎉");
        setEditingVerification((s) => ({ ...s, verified: true }));
        loadLinks();
      } else {
        toast.error("Not verified yet", {
          description: (data as any)?.message || "DNS may take a few minutes to propagate.",
        });
      }
    } catch (err: any) {
      toast.error("Verification failed", { description: err.message });
    } finally {
      setVerifyingDomain(false);
    }
  };

  return (
    <div className="min-h-screen bg-background mobile-safe-content">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        {/* Hero */}
        <div className="mb-6 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Sparkles className="h-5 w-5 text-primary" />
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">SmartLinks</h1>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/15 text-primary">Free on UPLY</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                One link → every platform. Pre-saves, social unlocks, contests, analytics — built in.
              </p>
              <div className="flex items-center gap-3 mt-3 flex-wrap text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Music className="h-3 w-3" /> Music</span>
                <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Unlocks</span>
                <span className="inline-flex items-center gap-1"><Gift className="h-3 w-3" /> Contests</span>
                <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> Email capture</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button asChild variant="outline" className="min-h-[44px]">
                <Link to="/smart-links/domains"><Globe className="h-4 w-4 mr-1.5" /> Domains</Link>
              </Button>
              <Button asChild variant="outline" className="min-h-[44px]">
                <Link to="/ads"><Zap className="h-4 w-4 mr-1.5" /> Ads</Link>
              </Button>
              <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
                <SheetTrigger asChild>
                  <Button onClick={openNew} className="min-h-[44px]">
                    <Plus className="h-4 w-4 mr-1.5" /> New SmartLink
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
                    <img src={form.cover_image_url} alt={form.title} className="mt-2 w-24 h-24 rounded object-cover" loading="lazy" />
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
                    <>
                      <div>
                        <Label>Release date</Label>
                        <Input
                          type="datetime-local"
                          value={form.release_date}
                          onChange={(e) => setForm({ ...form, release_date: e.target.value })}
                          style={{ fontSize: "16px" }}
                        />
                      </div>
                      <div>
                        <Label>Spotify URI (for unreleased tracks)</Label>
                        <Input
                          value={form.spotify_uri}
                          onChange={(e) => setForm({ ...form, spotify_uri: e.target.value })}
                          placeholder="spotify:track:4uLU6hMCjMI75M1A2tKUQC"
                          style={{ fontSize: "16px" }}
                        />
                        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                          Get this from your distributor (DistroKid, TuneCore, etc.) 3–7 days before release.
                          Leave blank if you have a public Spotify URL above.
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Capture emails</Label>
                      <p className="text-xs text-muted-foreground">Require email before redirect</p>
                    </div>
                    <Switch checked={form.capture_email} onCheckedChange={(v) => setForm({ ...form, capture_email: v })} />
                  </div>
                </div>

                {/* Social Unlock */}
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <Label className="text-base">Social Unlock (optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Require fans to take an action before they get a reward.
                      Hypeddit charges $10/mo for this — free on UPLY.
                    </p>
                  </div>
                  <Select
                    value={form.unlock_type}
                    onValueChange={(v) => setForm({ ...form, unlock_type: v as typeof form.unlock_type })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No unlock — anyone can access</SelectItem>
                      <SelectItem value="email">Email gate — enter email to unlock</SelectItem>
                      <SelectItem value="spotify_follow">Follow on Spotify to unlock</SelectItem>
                      <SelectItem value="social_share">Share to unlock</SelectItem>
                    </SelectContent>
                  </Select>

                  {form.unlock_type === "spotify_follow" && (
                    <div>
                      <Label>Spotify Artist ID</Label>
                      <Input
                        value={form.unlock_spotify_artist_id}
                        onChange={(e) => setForm({ ...form, unlock_spotify_artist_id: e.target.value })}
                        placeholder="e.g. 06HL4z0CvFAxyc27GXpf02"
                        style={{ fontSize: "16px" }}
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Found in open.spotify.com/artist/<b>[ID]</b>
                      </p>
                    </div>
                  )}

                  {form.unlock_type !== "none" && (
                    <>
                      <div>
                        <Label>Reward type</Label>
                        <Select
                          value={form.unlock_reward_type}
                          onValueChange={(v) => setForm({ ...form, unlock_reward_type: v as typeof form.unlock_reward_type })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="download">Free download</SelectItem>
                            <SelectItem value="content">Exclusive content link</SelectItem>
                            <SelectItem value="discount">Discount code</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Reward URL or code</Label>
                        <Input
                          value={form.unlock_reward_url}
                          onChange={(e) => setForm({ ...form, unlock_reward_url: e.target.value })}
                          placeholder="https://... or DISCOUNT20"
                          style={{ fontSize: "16px" }}
                        />
                      </div>
                      <div>
                        <Label>Reward button label</Label>
                        <Input
                          value={form.unlock_reward_label}
                          onChange={(e) => setForm({ ...form, unlock_reward_label: e.target.value })}
                          placeholder="Download Free Track"
                          style={{ fontSize: "16px" }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Contest / Giveaway */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Contest / Giveaway</Label>
                      <p className="text-xs text-muted-foreground">
                        Fans enter by email. Each referral = +1 entry.
                      </p>
                    </div>
                    <Switch
                      checked={form.contest_enabled}
                      onCheckedChange={(v) => setForm({ ...form, contest_enabled: v })}
                    />
                  </div>
                  {form.contest_enabled && (
                    <>
                      <div>
                        <Label>Prize description</Label>
                        <Input
                          value={form.contest_prize}
                          onChange={(e) => setForm({ ...form, contest_prize: e.target.value })}
                          placeholder="VIP tickets, signed merch, exclusive session..."
                          style={{ fontSize: "16px" }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>End date</Label>
                          <Input
                            type="datetime-local"
                            value={form.contest_end_date}
                            onChange={(e) => setForm({ ...form, contest_end_date: e.target.value })}
                            style={{ fontSize: "16px" }}
                          />
                        </div>
                        <div>
                          <Label>Winners</Label>
                          <Input
                            type="number"
                            min={1}
                            value={form.contest_winner_count}
                            onChange={(e) => setForm({ ...form, contest_winner_count: Number(e.target.value) || 1 })}
                            style={{ fontSize: "16px" }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Distribution / Affiliates */}
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <Label className="text-base">Distribution & Affiliates</Label>
                    <p className="text-xs text-muted-foreground">
                      Earn affiliate revenue and surface a TikTok sound for fans to use.
                    </p>
                  </div>
                  <div>
                    <Label>iTunes Affiliate Token</Label>
                    <Input
                      value={form.itunes_affiliate_token}
                      onChange={(e) => setForm({ ...form, itunes_affiliate_token: e.target.value })}
                      placeholder="e.g. 1010lLVK"
                      style={{ fontSize: "16px" }}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Auto-appended as <code>?at=</code> to Apple Music links.
                      Get yours at{" "}
                      <a
                        href="https://www.apple.com/itunes/affiliates/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Apple Affiliates
                      </a>
                      .
                    </p>
                  </div>
                  <div>
                    <Label>Amazon Associates Tag</Label>
                    <Input
                      value={form.amazon_affiliate_tag}
                      onChange={(e) => setForm({ ...form, amazon_affiliate_tag: e.target.value })}
                      placeholder="e.g. mysite-20"
                      style={{ fontSize: "16px" }}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Auto-appended as <code>?tag=</code> to Amazon Music links.
                      Get yours at{" "}
                      <a
                        href="https://affiliate-program.amazon.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Amazon Associates
                      </a>
                      .
                    </p>
                  </div>
                  <div>
                    <Label>TikTok Sound URL</Label>
                    <Input
                      value={form.tiktok_sound_url}
                      onChange={(e) => setForm({ ...form, tiktok_sound_url: e.target.value })}
                      placeholder="https://www.tiktok.com/music/..."
                      style={{ fontSize: "16px" }}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Adds a "Use This Sound on TikTok" button — perfect for going viral.
                    </p>
                  </div>
                </div>

                {/* Custom Domain */}
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <Label className="text-base">Custom Domain</Label>
                    <p className="text-xs text-muted-foreground">
                      Serve this SmartLink from your own domain (e.g. links.myband.com).
                      Linkfire charges $36/mo — free on UPLY.
                    </p>
                  </div>
                  <div>
                    <Label>Domain</Label>
                    <Input
                      value={form.custom_domain}
                      onChange={(e) =>
                        setForm({ ...form, custom_domain: e.target.value.trim().toLowerCase() })
                      }
                      placeholder="links.myband.com"
                      style={{ fontSize: "16px" }}
                    />
                  </div>
                  {editing && form.custom_domain && editingVerification.token && (
                    <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">DNS verification</span>
                        {editingVerification.verified ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-primary/15 text-primary">
                            ✓ Verified
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Add this TXT record at your DNS provider (Cloudflare, Namecheap, GoDaddy):
                      </p>
                      <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-[11px] font-mono">
                        <span className="text-muted-foreground">Type:</span>
                        <span>TXT</span>
                        <span className="text-muted-foreground">Host:</span>
                        <span className="break-all">{form.custom_domain}</span>
                        <span className="text-muted-foreground">Value:</span>
                        <span className="break-all">uply-verify={editingVerification.token}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleVerifyDomain}
                        disabled={verifyingDomain}
                        className="w-full min-h-[40px]"
                      >
                        {verifyingDomain ? "Checking DNS..." : "Verify domain"}
                      </Button>
                    </div>
                  )}
                  {!editing && form.custom_domain && (
                    <p className="text-[11px] text-muted-foreground">
                      Save the SmartLink first — verification instructions will appear after you create it.
                    </p>
                  )}
                </div>

                <Button onClick={handleSubmit} disabled={submitting} className="w-full min-h-[44px]">
                  {submitting ? "Saving..." : editing ? "Save changes" : "Create SmartLink"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
            </div>
          </div>
        </div>

        {/* Share Hub */}
        {!loading && links.length > 0 && <SmartLinkShareHub links={links} />}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : links.length === 0 ? (
          <Card className="p-10 sm:p-12 text-center bg-gradient-to-b from-card to-muted/20">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-primary/15 items-center justify-center mb-4">
              <Music className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-bold mb-1">Create your first SmartLink</h2>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
              Drop your release links once. Fans land on a beautiful page with every platform — and you keep every click, email, and pre-save.
            </p>
            <Button onClick={openNew} size="lg" className="min-h-[44px]">
              <Plus className="h-4 w-4 mr-2" /> Create SmartLink
            </Button>
            <p className="text-[11px] text-muted-foreground mt-3">
              Replaces ToneDen, Feature.fm, Linkfire — free.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {links.map((link) => {
              const platformCount = Object.keys(link.platforms || {}).filter(k => link.platforms[k]).length;
              return (
                <Card key={link.id} className="p-4 hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0 ring-1 ring-border">
                      {link.cover_image_url ? (
                        <img src={link.cover_image_url} alt={link.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Music className="h-6 w-6 text-muted-foreground" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{link.title}</h3>
                        {link.is_presave && (
                          <span className="text-[10px] uppercase tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded">Pre-save</span>
                        )}
                      </div>
                      {link.artist && <p className="text-xs text-muted-foreground truncate">{link.artist}</p>}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="font-mono truncate">/link/{link.slug}</span>
                        <span className="hidden sm:inline">·</span>
                        <span className="hidden sm:inline tabular-nums"><b className="text-foreground">{link.click_count}</b> clicks</span>
                        <span className="hidden sm:inline">·</span>
                        <span className="hidden sm:inline">{platformCount} platforms</span>
                      </div>
                    </div>
                    <div className="hidden md:flex flex-col items-end shrink-0">
                      <span className="text-xl font-extrabold tabular-nums">{link.click_count}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">clicks</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/60 flex-wrap">
                    <Button size="sm" variant="ghost" onClick={() => copyUrl(link.slug)} className="h-9 gap-1.5">
                      <Copy className="h-3.5 w-3.5" /> <span className="text-xs">Copy</span>
                    </Button>
                    <Button size="sm" variant="ghost" asChild className="h-9 gap-1.5">
                      <Link to={`/link/${link.slug}`} target="_blank"><ExternalLink className="h-3.5 w-3.5" /> <span className="text-xs">Open</span></Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild className="h-9 gap-1.5">
                      <Link to={`/smart-links/${link.id}/analytics`}><BarChart3 className="h-3.5 w-3.5" /> <span className="text-xs">Stats</span></Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild className="h-9 gap-1.5 text-primary">
                      <Link to={`/smart-links/campaign?link_id=${link.id}`}><Zap className="h-3.5 w-3.5" /> <span className="text-xs">Promote</span></Link>
                    </Button>
                    <div className="ml-auto flex items-center gap-0.5">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(link)} title="Edit" className="h-9 w-9">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(link.id)} title="Delete" className="h-9 w-9">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
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
