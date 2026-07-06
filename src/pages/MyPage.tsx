import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Plus, Trash2, GripVertical, Copy, Check, ExternalLink, Loader2, Eye, Edit2, Link2, Sparkles } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import BackNav from "@/components/BackNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SEOHead from "@/components/SEOHead";
import LinkInBioRenderer from "@/_archive/bio-page/components/pages/LinkInBioRenderer";
import SiteBuilder from "@/components/sitebuilder/SiteBuilder";

export default function MyPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profileId = profile?.id;
  const [tab, setTab] = useState("bio");
  const [creatingPage, setCreatingPage] = useState(false);
  const [pageTypeDialog, setPageTypeDialog] = useState(false);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [tagline, setTagline] = useState("");
  const [bgColor, setBgColor] = useState("#0A0A0A");
  const [accentColor, setAccentColor] = useState("#3D7CFF");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: links = [], refetch: refetchLinks } = useQuery({
    queryKey: ["bio-links", profileId],
    queryFn: async () => {
      const { data } = await supabase.from("bio_links").select("*").eq("creator_id", profileId!).order("position");
      return data || [];
    },
    enabled: !!profileId,
  });

  const { data: bioPage } = useQuery({
    queryKey: ["bio-page", profileId],
    queryFn: async () => {
      const { data } = await supabase.from("creator_pages").select("*").eq("creator_id", profileId!).eq("page_type", "link_in_bio").single();
      return data;
    },
    enabled: !!profileId,
  });

  const { data: domain } = useQuery({
    queryKey: ["creator-domain", profileId],
    queryFn: async () => {
      const { data } = await supabase.from("creator_domains").select("*").eq("creator_id", profileId!).single();
      return data;
    },
    enabled: !!profileId,
  });

  const { data: pages = [] } = useQuery({
    queryKey: ["funnel-pages", profileId],
    queryFn: async () => {
      const { data } = await supabase.from("creator_pages").select("*").eq("creator_id", profileId!).neq("page_type", "link_in_bio").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profileId,
  });

  useEffect(() => {
    if (bioPage?.content) {
      const c = bioPage.content as any;
      setTagline(c.tagline || "");
      setBgColor(c.bgColor || "#0A0A0A");
      setAccentColor(c.accentColor || "#3D7CFF");
    }
  }, [bioPage]);

  const addLink = async (title: string, url: string, linkType = "custom") => {
    if (!profileId) return;
    await supabase.from("bio_links").insert({ creator_id: profileId, title, url, link_type: linkType, position: links.length });
    refetchLinks();
  };

  const removeLink = async (id: string) => {
    await supabase.from("bio_links").delete().eq("id", id);
    refetchLinks();
  };

  const updateLink = async (id: string, updates: any) => {
    await supabase.from("bio_links").update(updates).eq("id", id);
    refetchLinks();
  };

  const publishBio = async () => {
    if (!profileId) return;
    setSaving(true);
    const slug = profile?.username || profileId;
    const content = { tagline, bgColor, accentColor };
    await supabase.from("creator_pages").upsert({
      creator_id: profileId, page_type: "link_in_bio", title: profile?.display_name || "Bio", slug, is_published: true, content,
    }, { onConflict: "creator_id,slug" });
    toast.success("Bio page published!");
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["bio-page"] });
  };

  const bioUrl = `${window.location.origin}/${profile?.username || user?.id}/page`;
  const copyUrl = () => { navigator.clipboard.writeText(bioUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const createFunnelPage = async (pageType: string) => {
    if (!profileId) { toast.error("Profile not ready"); return; }
    setCreatingPage(true);
    try {
      const baseSlug = `${pageType}-${Date.now().toString(36)}`;
      const { data, error } = await supabase
        .from("creator_pages")
        .insert({
          creator_id: profileId,
          page_type: pageType,
          title: "Untitled page",
          slug: baseSlug,
          is_published: false,
          content: {},
        })
        .select("id")
        .single();
      if (error) throw error;
      setPageTypeDialog(false);
      toast.success("Page created — opening editor");
      navigate(`/my-page/funnel/${data.id}`);
    } catch (e: any) {
      toast.error("Couldn't create page", { description: e?.message });
    } finally {
      setCreatingPage(false);
    }
  };

  const editorContent = {
    displayName: profile?.display_name || "",
    avatarUrl: profile?.avatar_url || "",
    tagline,
    bgColor,
    accentColor,
    links: links.filter((l: any) => l.is_active),
  };


  return (
    <AppLayout>
      <SEOHead title="My Page" description="Manage your bio link and funnel pages" />
      <div className="max-w-6xl mx-auto px-4 py-4 pb-24">
        <BackNav label="My Page" />
        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="bio">Bio Page</TabsTrigger>
            <TabsTrigger value="website">Website</TabsTrigger>
            <TabsTrigger value="funnels">Funnel Pages</TabsTrigger>
            <TabsTrigger value="domain">Custom Domain</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="bio" className="mt-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Editor */}
              <div className="flex-1 space-y-4">
                <Card className="border-border"><CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm">Bio</h3>
                  <Input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Your tagline..." maxLength={100} />
                  <div className="flex gap-3">
                    <div className="flex-1"><label className="text-xs text-muted-foreground">Background</label><Input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="h-10" /></div>
                    <div className="flex-1"><label className="text-xs text-muted-foreground">Accent</label><Input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="h-10" /></div>
                  </div>
                </CardContent></Card>

                <Card className="border-border"><CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Links</h3>
                    <Button size="sm" variant="outline" onClick={() => addLink("New Link", "https://")}>
                      <Plus className="w-3 h-3 mr-1" /> Add Link
                    </Button>
                  </div>
                  {links.map((link: any, i: number) => (
                    <div key={link.id} className="flex items-center gap-2 p-2 rounded-lg border border-border">
                      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 space-y-1">
                        <Input value={link.title} onChange={e => updateLink(link.id, { title: e.target.value })} placeholder="Title" className="h-8 text-sm" />
                        <Input value={link.url} onChange={e => updateLink(link.id, { url: e.target.value })} placeholder="URL" className="h-8 text-sm" />
                      </div>
                      <Switch checked={link.is_active} onCheckedChange={v => updateLink(link.id, { is_active: v })} />
                      <Button size="sm" variant="ghost" onClick={() => removeLink(link.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  ))}
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => addLink("My Community", `/community/${user?.id}`, "uply_community")}>+ Community</Button>
                    <Button size="sm" variant="outline" onClick={() => addLink("Twitter", "https://twitter.com/", "social")}>+ Social</Button>
                  </div>
                </CardContent></Card>

                <div className="flex gap-2">
                  <Button onClick={publishBio} disabled={saving} className="flex-1">
                    {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Globe className="w-4 h-4 mr-1" />}
                    Save & Publish
                  </Button>
                  <Button variant="outline" onClick={copyUrl}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Preview */}
              <div className="w-full lg:w-[400px] shrink-0">
                <div className="flex gap-2 mb-3">
                  <Button size="sm" variant={previewMode === "mobile" ? "default" : "outline"} onClick={() => setPreviewMode("mobile")}>Mobile</Button>
                  <Button size="sm" variant={previewMode === "desktop" ? "default" : "outline"} onClick={() => setPreviewMode("desktop")}>Desktop</Button>
                </div>
                <div className={`border border-border rounded-xl overflow-hidden mx-auto ${previewMode === "mobile" ? "max-w-[375px]" : "w-full"}`} style={{ minHeight: 500 }}>
                  <LinkInBioRenderer {...editorContent} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="website" className="mt-4">
            <SiteBuilder />
          </TabsContent>

          <TabsContent value="funnels" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pages.map((page: any) => (
                <Card
                  key={page.id}
                  className="border-border cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => navigate(`/my-page/funnel/${page.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{page.page_type.replace("_", " ")}</Badge>
                      <Badge variant={page.is_published ? "default" : "outline"}>{page.is_published ? "Published" : "Draft"}</Badge>
                    </div>
                    <h3 className="font-semibold">{page.title || "Untitled"}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{page.view_count} views · Tap to edit with AI</p>
                  </CardContent>
                </Card>
              ))}
              <Card
                className="border-dashed border-border cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => setPageTypeDialog(true)}
              >
                <CardContent className="p-4 flex flex-col items-center justify-center min-h-[120px]">
                  <Sparkles className="w-8 h-8 text-primary mb-2" />
                  <p className="text-sm font-medium">Create page with AI</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Landing, sales, opt-in & more</p>
                </CardContent>
              </Card>
            </div>

            <Dialog open={pageTypeDialog} onOpenChange={setPageTypeDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Pick a page type</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: "landing", label: "Landing" },
                    { type: "sales", label: "Sales" },
                    { type: "opt_in", label: "Opt-in" },
                    { type: "thank_you", label: "Thank you" },
                  ].map((p) => (
                    <Button
                      key={p.type}
                      variant="outline"
                      disabled={creatingPage}
                      onClick={() => createFunnelPage(p.type)}
                      className="h-auto py-3 flex flex-col items-start"
                    >
                      <span className="font-semibold">{p.label}</span>
                      <span className="text-[11px] text-muted-foreground">{p.type.replace("_", " ")} page</span>
                    </Button>
                  ))}
                </div>
                {creatingPage && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating…
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>


          <TabsContent value="domain" className="mt-4 space-y-4">
            <Card className="border-border"><CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2">Your UPLY URL</h3>
              <div className="flex items-center gap-2">
                <Input value={bioUrl} readOnly className="text-sm" />
                <Button variant="outline" onClick={copyUrl}>{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
              </div>
            </CardContent></Card>
            <Card className="border-border"><CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-sm">Custom Domain</h3>
              {domain?.domain_status === "active" ? (
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary font-medium">{domain.custom_domain} — Connected</span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Point your domain's CNAME to <code className="text-primary">cname.uply.tv</code></p>
                  <div className="bg-card rounded-lg p-3 text-xs font-mono space-y-1">
                    <p>Type: CNAME</p><p>Host: @</p><p>Value: cname.uply.tv</p><p>TTL: 3600</p>
                  </div>
                  <Button variant="outline" onClick={() => toast.success("Domain verification", { description: "Coming soon — use verify-custom-domain edge function" })}>
                    Verify Domain
                  </Button>
                </>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <Card className="border-border"><CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3">Page Analytics</h3>
              {bioPage && (
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <div><p className="text-sm font-medium">Bio Page</p><p className="text-xs text-muted-foreground">link_in_bio</p></div>
                  <p className="text-sm font-bold">{bioPage.view_count} views</p>
                </div>
              )}
              {pages.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div><p className="text-sm font-medium">{p.title || "Untitled"}</p><p className="text-xs text-muted-foreground">{p.page_type}</p></div>
                  <p className="text-sm font-bold">{p.view_count} views</p>
                </div>
              ))}
              {!bioPage && pages.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No pages created yet</p>}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
