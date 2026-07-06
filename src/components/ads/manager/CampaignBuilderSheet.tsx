import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, Save, Rocket, Info, Users, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  PLATFORMS,
  PLATFORM_BY_ID,
  OBJECTIVES,
  CTA_OPTIONS,
} from "./platforms";
import AdPreviewCard from "./AdPreviewCard";
import { useAdCampaigns, type AdCampaignRow, type AdPlatform } from "@/hooks/useAdCampaigns";

/** Audience presets mirror the existing AudienceTemplates / BoostCampaignBuilder set. */
const AUDIENCE_PRESETS = [
  { id: "lookalike", label: "Lookalike from Members" },
  { id: "stream-viewers", label: "Retarget Stream Viewers" },
  { id: "page-visitors", label: "Retarget Page Visitors" },
  { id: "abandoned-checkout", label: "Retarget Abandoned Checkout" },
  { id: "broad", label: "Broad — AI Optimized" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: AdCampaignRow | null;
  advertiser: string;
  /** providers with an active OAuth ad-account link (from ad_connections). */
  connectedProviders: Set<"meta" | "google">;
}

export default function CampaignBuilderSheet({
  open,
  onOpenChange,
  editing,
  advertiser,
  connectedProviders,
}: Props) {
  const navigate = useNavigate();
  const { createCampaign, updateCampaign, isCreating } = useAdCampaigns();

  const [platform, setPlatform] = useState<AdPlatform>("facebook");
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("conversions");
  const [budget, setBudget] = useState("20"); // dollars, string for input
  const [audienceId, setAudienceId] = useState("lookalike");
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [cta, setCta] = useState("Learn More");
  const [creativeUrl, setCreativeUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // (Re)hydrate when opening / switching target
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setPlatform(editing.platform);
      setName(editing.name ?? "");
      setObjective(editing.objective ?? "conversions");
      setBudget(editing.budget_daily_cents != null ? String(editing.budget_daily_cents / 100) : "20");
      setAudienceId(((editing.audience as any)?.id as string) ?? "lookalike");
      setHeadline(editing.headline ?? "");
      setPrimaryText(editing.primary_text ?? "");
      setCta(editing.cta ?? "Learn More");
      setCreativeUrl(editing.creative_url ?? "");
    } else {
      setPlatform("facebook");
      setName("");
      setObjective("conversions");
      setBudget("20");
      setAudienceId("lookalike");
      setHeadline("");
      setPrimaryText("");
      setCta("Learn More");
      setCreativeUrl("");
    }
  }, [open, editing]);

  const provider = PLATFORM_BY_ID[platform].connProvider;
  const platformConnected = connectedProviders.has(provider);

  const budgetCents = useMemo(() => {
    const n = Math.round(parseFloat(budget) * 100);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [budget]);

  const generateCopy = async () => {
    const seed = name || headline || `${PLATFORM_BY_ID[platform].label} ad`;
    setGenerating(true);
    try {
      // Reuse the EXISTING marketing-copy edge fn (Anthropic path) — no new fn.
      const { data, error } = await supabase.functions.invoke("generate-product-copy", {
        body: {
          prompt: `Write a high-converting ${PLATFORM_BY_ID[platform].label} ad for this creator offer, optimized for the "${objective}" objective: ${seed}.`,
        },
      });
      if (error) throw error;
      if (data?.name) setHeadline(String(data.name).slice(0, 80));
      if (data?.description) setPrimaryText(String(data.description));
      toast.success("Ad copy drafted by ARIA", {
        description: "Review and tweak before saving.",
      });
    } catch (e: any) {
      toast.error("Couldn't generate copy", { description: e?.message || "Try again shortly." });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Give your campaign a name first");
      return;
    }
    setSaving(true);
    const audience = AUDIENCE_PRESETS.find((a) => a.id === audienceId) ?? null;
    const payload = {
      name: name.trim(),
      platform,
      objective,
      budget_daily_cents: budgetCents,
      headline: headline.trim() || null,
      primary_text: primaryText.trim() || null,
      cta,
      audience: audience ? { id: audience.id, label: audience.label } : null,
      creative_url: creativeUrl.trim() || null,
    };
    try {
      if (editing) {
        await updateCampaign({ id: editing.id, ...payload });
        toast.success("Draft updated");
      } else {
        await createCampaign(payload);
        toast.success("Draft saved", { description: "Find it in your campaigns list." });
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Couldn't save draft", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl overflow-y-auto p-0"
      >
        <div className="grid lg:grid-cols-[1fr_320px]">
          {/* ─── Form ─── */}
          <div className="p-6 space-y-6">
            <SheetHeader className="text-left space-y-1">
              <SheetTitle>{editing ? "Edit campaign" : "New ad campaign"}</SheetTitle>
              <SheetDescription>
                Compose your ad and save it as a draft. Publishing goes live in Phase 2.
              </SheetDescription>
            </SheetHeader>

            {/* Platform */}
            <div className="space-y-2">
              <Label>Platform</Label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map((p) => {
                  const Icon = p.icon;
                  const active = platform === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlatform(p.id)}
                      className={`flex flex-col items-center gap-1.5 border p-3 text-xs font-semibold transition-colors ${
                        active
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Icon className="w-5 h-5" style={{ color: active ? p.color : undefined }} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name + objective */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="camp-name">Campaign name</Label>
                <Input
                  id="camp-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Spring course launch"
                />
              </div>
              <div className="space-y-2">
                <Label>Objective</Label>
                <Select value={objective} onValueChange={setObjective}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OBJECTIVES.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                        <span className="text-muted-foreground"> — {o.desc}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Budget + audience */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="camp-budget">Daily budget (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="camp-budget"
                    type="number"
                    min={1}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="pl-6"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Audience
                </Label>
                <Select value={audienceId} onValueChange={setAudienceId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_PRESETS.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Creative */}
            <div className="space-y-4 border-t border-border pt-5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Ad creative</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateCopy}
                  disabled={generating}
                  className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                >
                  {generating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Generate with ARIA
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="camp-headline">Headline</Label>
                <Input
                  id="camp-headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Join 2,000+ members leveling up weekly"
                  maxLength={80}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="camp-primary">Primary text</Label>
                <Textarea
                  id="camp-primary"
                  value={primaryText}
                  onChange={(e) => setPrimaryText(e.target.value)}
                  placeholder="Tell people why they should care…"
                  rows={3}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Call to action</Label>
                  <Select value={cta} onValueChange={setCta}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CTA_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="camp-image">Image URL</Label>
                  <Input
                    id="camp-image"
                    value={creativeUrl}
                    onChange={(e) => setCreativeUrl(e.target.value)}
                    placeholder="https://…/creative.jpg"
                  />
                </div>
              </div>
            </div>

            {/* Publish banner — non-deceptive */}
            <div className="border border-border bg-muted/40 p-3 flex gap-2.5">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-2">
                <p>
                  {platformConnected ? (
                    <>
                      Your {PLATFORM_BY_ID[platform].label} account is linked. One-click publishing
                      to the live ad platform is coming in Phase 2 — for now, campaigns save as
                      drafts.
                    </>
                  ) : (
                    <>
                      Publishing to {PLATFORM_BY_ID[platform].label} requires connecting your ad
                      account — connect to go live. Your draft still saves fully.
                    </>
                  )}
                </p>
                {!platformConnected && (
                  <button
                    onClick={() =>
                      navigate(provider === "meta" ? "/settings/connections" : "/ad-integrations")
                    }
                    className="text-primary hover:underline font-medium"
                  >
                    Connect {PLATFORM_BY_ID[platform].label} account →
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleSave}
                disabled={saving || isCreating}
                className="gap-1.5"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing ? "Save changes" : "Save draft"}
              </Button>
              {/* Publish stays disabled in v1 — never faked. */}
              <Button variant="outline" disabled className="gap-1.5" title="Available in Phase 2">
                <Lock className="w-4 h-4" />
                Coming soon: 1-click publish
              </Button>
            </div>
          </div>

          {/* ─── Live preview ─── */}
          <div className="bg-muted/30 border-l border-border p-6 lg:sticky lg:top-0 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 inline-flex items-center gap-1.5">
              <Rocket className="w-3.5 h-3.5" /> Live preview
            </p>
            <AdPreviewCard
              platform={platform}
              headline={headline}
              primaryText={primaryText}
              cta={cta}
              creativeUrl={creativeUrl}
              advertiser={advertiser}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
