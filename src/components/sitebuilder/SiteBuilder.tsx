// No-code creator Website builder (Phase 1).
// Section-based site: pick/reorder/edit sections, choose a theme, publish to
// creator_pages (page_type = 'website'). Shares <SiteRenderer /> with the
// public view so the preview is pixel-identical to what visitors see.
import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Pencil,
  GripVertical,
  CalendarCheck,
  Sparkles,
} from "lucide-react";
import { SETUP_CALL_URL } from "@/components/pricing/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SITE_TEMPLATES, applyTemplate, type SiteTemplate } from "./templates";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SiteRenderer from "./SiteRenderer";
import SectionEditor from "./SectionEditor";
import {
  SECTION_KINDS,
  SECTION_META,
  DEFAULT_THEME,
  DEFAULT_ACCENT,
  makeSection,
  starterSections,
  sectionTitle,
  type SectionKind,
  type SiteSection,
  type SiteTheme,
} from "./types";

export default function SiteBuilder() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const profileId = profile?.id;
  const username = profile?.username;

  const [sections, setSections] = useState<SiteSection[]>([]);
  const [theme, setTheme] = useState<SiteTheme>(DEFAULT_THEME);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const handleApplyTemplate = (template: SiteTemplate) => {
    const { sections: next, theme: nextTheme } = applyTemplate(template);
    setSections(next);
    setTheme(nextTheme);
    setTemplatesOpen(false);
    toast.success(`${template.name} template applied`, {
      description: "Make it yours — edit any section, then Save or Publish.",
    });
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("desktop");
  const [isPublished, setIsPublished] = useState(false);
  const [copied, setCopied] = useState(false);
  const loadedRef = useRef(false);

  const {
    data: page,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["website-page", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creator_pages")
        .select("*")
        .eq("creator_id", profileId!)
        .eq("page_type", "website")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Hydrate builder state once from the loaded page (or a starter site).
  useEffect(() => {
    if (loadedRef.current || isLoading) return;
    if (page) {
      const content = (page.content || {}) as any;
      setSections(Array.isArray(content.sections) ? content.sections : starterSections());
      setTheme({ ...DEFAULT_THEME, ...(content.theme || {}) });
      setIsPublished(!!page.is_published);
    } else {
      setSections(starterSections());
      setTheme(DEFAULT_THEME);
    }
    loadedRef.current = true;
  }, [page, isLoading]);

  const selected = sections.find((s) => s.id === selectedId) || null;

  // --- section list operations ---
  const addSection = (kind: SectionKind) => {
    const s = makeSection(kind);
    setSections((prev) => [...prev, s]);
    setSelectedId(s.id);
  };
  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const toggleVisible = (id: string) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)));
  const move = (id: string, dir: -1 | 1) =>
    setSections((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const updateSectionProps = (id: string, props: Record<string, any>) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, props } : s)));

  // --- persistence ---
  const save = useMutation({
    mutationFn: async (publish: boolean) => {
      if (!profileId) throw new Error("Profile not ready");
      const slug = `site-${profileId}`;
      const { error } = await supabase.from("creator_pages").upsert(
        {
          creator_id: profileId,
          page_type: "website",
          title: profile?.display_name ? `${profile.display_name} — Website` : "Website",
          slug,
          is_published: publish,
          content: { sections, theme } as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "creator_id,slug" }
      );
      if (error) throw error;
      return publish;
    },
    onSuccess: (publish) => {
      setIsPublished(publish);
      toast.success(publish ? "Website published!" : "Draft saved");
      qc.invalidateQueries({ queryKey: ["website-page", profileId] });
    },
    onError: (e: any) => toast.error("Couldn't save", { description: e?.message }),
  });

  const publicUrl = username ? `${window.location.origin}/${username}/site` : "";
  const copyUrl = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-24 w-full rounded-none" />
          <Skeleton className="h-40 w-full rounded-none" />
        </div>
        <Skeleton className="h-[500px] w-full lg:w-[420px] rounded-none" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-border">
        <CardContent className="p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Couldn't load your website.</p>
          <Button variant="outline" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left: controls */}
      <div className="flex-1 space-y-4 min-w-0">
        {/* Publish bar */}
        <Card className="border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Your website</h3>
                <Badge variant={isPublished ? "default" : "outline"}>
                  {isPublished ? "Published" : "Draft"}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => save.mutate(false)} disabled={save.isPending}>
                  {save.isPending && !isPublished ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save draft"}
                </Button>
                <Button size="sm" onClick={() => save.mutate(true)} disabled={save.isPending}>
                  {save.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Globe className="w-3.5 h-3.5 mr-1" />}
                  Publish
                </Button>
              </div>
            </div>
            {publicUrl ? (
              <div className="flex items-center gap-2">
                <Input value={publicUrl} readOnly className="text-xs h-8" />
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={copyUrl}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
                <Button size="sm" variant="outline" className="h-8 px-2" asChild>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Set a username in Settings to get a public URL.</p>
            )}
          </CardContent>
        </Card>

        {/* Theme */}
        <Card className="border-border">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Theme</h3>
            <div className="flex items-end gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Accent</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={theme.accent}
                    onChange={(e) => setTheme((t) => ({ ...t, accent: e.target.value }))}
                    className="h-9 w-14 p-1"
                  />
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setTheme((t) => ({ ...t, accent: DEFAULT_ACCENT }))}>
                    Reset
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Mode</Label>
                <div className="flex gap-1">
                  <Button size="sm" variant={theme.mode === "light" ? "default" : "outline"} onClick={() => setTheme((t) => ({ ...t, mode: "light" }))}>Light</Button>
                  <Button size="sm" variant={theme.mode === "dark" ? "default" : "outline"} onClick={() => setTheme((t) => ({ ...t, mode: "dark" }))}>Dark</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Done-for-you: hire the UPLY team */}
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
              <div>
                <h3 className="font-semibold text-sm">Want it done for you?</h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-md">
                  Our team builds your custom website &amp; funnel with you on a call —
                  design, copy, and setup handled. Free with your trial.
                </p>
              </div>
              <Button
                size="sm"
                className="shrink-0 font-bold"
                onClick={() => window.open(SETUP_CALL_URL, "_blank", "noopener,noreferrer")}
              >
                <CalendarCheck className="w-4 h-4 mr-1.5" /> Book a build call
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sections list */}
        <Card className="border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Sections</h3>
              <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setTemplatesOpen(true)}>
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Templates
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add section
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {SECTION_KINDS.map((kind) => {
                    const meta = SECTION_META[kind];
                    const Icon = meta.icon;
                    return (
                      <DropdownMenuItem key={kind} onClick={() => addSection(kind)} className="gap-2 items-start py-2">
                        <Icon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{meta.label}</span>
                          <span className="text-[11px] text-muted-foreground">{meta.description}</span>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>

            {sections.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No sections yet. Add your first one above.
              </p>
            )}

            <div className="space-y-2">
              {sections.map((s, i) => {
                const meta = SECTION_META[s.kind];
                const Icon = meta.icon;
                const active = s.id === selectedId;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-2 p-2 border ${active ? "border-primary" : "border-border"} ${s.visible ? "" : "opacity-50"}`}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <button className="flex-1 min-w-0 text-left" onClick={() => setSelectedId(active ? null : s.id)}>
                      <span className="text-sm font-medium block truncate">{sectionTitle(s)}</span>
                      <span className="text-[11px] text-muted-foreground">{meta.label}</span>
                    </button>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => move(s.id, -1)} disabled={i === 0}>
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => move(s.id, 1)} disabled={i === sections.length - 1}>
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleVisible(s.id)}>
                        {s.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedId(active ? null : s.id)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeSection(s.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected section editor */}
        {selected && (
          <Card className="border-primary/40">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Edit: {SECTION_META[selected.kind].label}</h3>
                <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>Done</Button>
              </div>
              <SectionEditor section={selected} onChange={(props) => updateSectionProps(selected.id, props)} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right: live preview */}
      <div className="w-full lg:w-[420px] shrink-0">
        <div className="flex gap-2 mb-3">
          <Button size="sm" variant={previewMode === "desktop" ? "default" : "outline"} onClick={() => setPreviewMode("desktop")}>Desktop</Button>
          <Button size="sm" variant={previewMode === "mobile" ? "default" : "outline"} onClick={() => setPreviewMode("mobile")}>Mobile</Button>
        </div>
        <div className="border border-border overflow-hidden">
          <div
            className={`overflow-y-auto overflow-x-hidden mx-auto ${previewMode === "mobile" ? "max-w-[390px]" : "w-full"}`}
            style={{ height: 620 }}
          >
            <SiteRenderer
              sections={sections}
              theme={theme}
              productsUserId={user?.id}
              displayName={profile?.display_name || undefined}
              avatarUrl={profile?.avatar_url || undefined}
            />
          </div>
        </div>
      </div>

      {/* Template picker */}
      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Start from a template</DialogTitle>
            <DialogDescription>
              Pick a proven layout for your kind of business. Applying replaces your current sections — you can edit everything after.
            </DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            {SITE_TEMPLATES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleApplyTemplate(t)}
                  className="text-left border border-border hover:border-primary hover:bg-muted/50 transition-colors p-4 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center justify-center w-8 h-8 shrink-0"
                      style={{ background: t.theme.accent, color: "#fff" }}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-semibold text-sm leading-tight">{t.name}</div>
                      <div className="text-[11px] text-muted-foreground">{t.forWho}</div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{t.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.sections.map((s, i) => (
                      <span key={i} className="text-[10px] uppercase tracking-wide bg-muted px-1.5 py-0.5 text-muted-foreground">
                        {s.kind}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
