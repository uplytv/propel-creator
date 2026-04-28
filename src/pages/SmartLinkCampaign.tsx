import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Download, Save, Sparkles, Target, Users, Wallet, Image as ImageIcon, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import {
  buildMetaBrief,
  buildGoogleCSV,
  buildTikTokBrief,
  downloadFile,
  type CampaignBrief,
} from "@/lib/smartLinkBriefExporters";

const STEPS = [
  { id: 1, label: "Goal", icon: Target },
  { id: 2, label: "Audience", icon: Users },
  { id: 3, label: "Budget", icon: Wallet },
  { id: 4, label: "Creative", icon: ImageIcon },
  { id: 5, label: "Export", icon: Download },
];

const PLACEMENTS = [
  { key: "facebook_feed", label: "Facebook Feed" },
  { key: "instagram_feed", label: "Instagram Feed" },
  { key: "instagram_reels", label: "Instagram Reels" },
  { key: "instagram_stories", label: "Instagram Stories" },
  { key: "facebook_stories", label: "Facebook Stories" },
  { key: "audience_network_native", label: "Audience Network" },
];

const COUNTRIES = ["US", "CA", "GB", "AU", "DE", "FR", "MX", "BR", "JP", "ES", "IT", "NL", "SE"];

export default function SmartLinkCampaign() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const linkId = params.get("link_id");
  const editId = params.get("id");

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [smartLinks, setSmartLinks] = useState<{ id: string; title: string; slug: string; cover_image_url: string | null }[]>([]);

  const [form, setForm] = useState({
    name: "",
    smart_link_id: linkId || "",
    platform: "meta" as "meta" | "google" | "tiktok",
    objective: "TRAFFIC",
    daily_budget: 20,
    total_budget: 0,
    start_date: "",
    end_date: "",
    age_min: 18,
    age_max: 45,
    genders: ["all"] as string[],
    countries: ["US"] as string[],
    interests: "",
    behaviors: "",
    placements: ["instagram_feed", "instagram_reels", "facebook_feed"] as string[],
    languages: "en",
    headline: "",
    primary_text: "",
    description: "",
    cta: "LISTEN_NOW",
    image_url: "",
    landing_url: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("smart_links")
      .select("id, title, slug, cover_image_url")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setSmartLinks(data || []));
  }, [user]);

  // Auto-fill creative from selected SmartLink
  useEffect(() => {
    const sl = smartLinks.find((s) => s.id === form.smart_link_id);
    if (sl && !form.headline) {
      setForm((f) => ({
        ...f,
        headline: sl.title,
        landing_url: `${window.location.origin}/link/${sl.slug}`,
        image_url: sl.cover_image_url || "",
        name: f.name || `${sl.title} — ${new Date().toLocaleDateString()}`,
      }));
    }
  }, [form.smart_link_id, smartLinks]);

  // Load existing campaign if editing
  useEffect(() => {
    if (!editId || !user) return;
    supabase
      .from("smart_link_campaigns")
      .select("*")
      .eq("id", editId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setForm((f) => ({
          ...f,
          name: data.name,
          smart_link_id: data.smart_link_id || "",
          platform: data.platform as any,
          objective: data.objective,
          daily_budget: Number(data.daily_budget),
          total_budget: Number(data.total_budget || 0),
          start_date: data.start_date ? data.start_date.slice(0, 16) : "",
          end_date: data.end_date ? data.end_date.slice(0, 16) : "",
          age_min: (data.audience as any)?.age_min ?? 18,
          age_max: (data.audience as any)?.age_max ?? 45,
          genders: (data.audience as any)?.genders ?? ["all"],
          countries: (data.audience as any)?.countries ?? ["US"],
          interests: ((data.audience as any)?.interests ?? []).join(", "),
          behaviors: ((data.audience as any)?.behaviors ?? []).join(", "),
          placements: (data.targeting as any)?.placements ?? [],
          languages: ((data.targeting as any)?.languages ?? ["en"]).join(","),
          headline: (data.creative as any)?.headline ?? "",
          primary_text: (data.creative as any)?.primary_text ?? "",
          description: (data.creative as any)?.description ?? "",
          cta: (data.creative as any)?.cta ?? "LISTEN_NOW",
          image_url: (data.creative as any)?.image_url ?? "",
          landing_url: (data.creative as any)?.landing_url ?? "",
        }));
      });
  }, [editId, user]);

  const brief: CampaignBrief = useMemo(
    () => ({
      name: form.name,
      objective: form.objective,
      daily_budget: form.daily_budget,
      total_budget: form.total_budget || null,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      audience: {
        age_min: form.age_min,
        age_max: form.age_max,
        genders: form.genders as any,
        countries: form.countries,
        interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
        behaviors: form.behaviors.split(",").map((s) => s.trim()).filter(Boolean),
      },
      targeting: {
        placements: form.placements,
        devices: ["mobile", "desktop"],
        languages: form.languages.split(",").map((s) => s.trim()).filter(Boolean),
      },
      creative: {
        headline: form.headline,
        primary_text: form.primary_text,
        description: form.description,
        cta: form.cta,
        image_url: form.image_url,
        landing_url: form.landing_url,
      },
    }),
    [form]
  );

  const exportedBrief = useMemo(() => {
    if (form.platform === "meta") return buildMetaBrief(brief);
    if (form.platform === "tiktok") return buildTikTokBrief(brief);
    return null; // google handled as csv
  }, [form.platform, brief]);

  const handleDownload = () => {
    const safeName = form.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "campaign";
    if (form.platform === "google") {
      downloadFile(`${safeName}-google-ads.csv`, buildGoogleCSV(brief), "text/csv");
    } else {
      downloadFile(
        `${safeName}-${form.platform}.json`,
        JSON.stringify(exportedBrief, null, 2),
        "application/json"
      );
    }
    toast.success("Brief downloaded");
  };

  const handleSave = async (status: "draft" | "exported") => {
    if (!user) return;
    if (!form.name.trim()) return toast.error("Name your campaign");
    if (!form.landing_url) return toast.error("Landing URL is required");
    setSaving(true);
    try {
      const payload = {
        creator_id: user.id,
        smart_link_id: form.smart_link_id || null,
        name: form.name,
        platform: form.platform,
        objective: form.objective,
        daily_budget: form.daily_budget,
        total_budget: form.total_budget || null,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        audience: brief.audience,
        targeting: brief.targeting,
        creative: brief.creative,
        brief: exportedBrief || { format: "google_csv", csv: buildGoogleCSV(brief) },
        status,
      };
      if (editId) {
        const { error } = await supabase
          .from("smart_link_campaigns")
          .update(payload)
          .eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("smart_link_campaigns").insert(payload);
        if (error) throw error;
      }
      toast.success(status === "exported" ? "Saved & marked exported" : "Draft saved");
      navigate("/smart-links");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const next = () => setStep((s) => Math.min(STEPS.length, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const toggle = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  return (
    <div className="min-h-screen bg-background mobile-safe-content">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <Link to="/smart-links" className="inline-flex items-center text-sm text-muted-foreground mb-4 min-h-[44px]">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to SmartLinks
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Ad Campaign Builder</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Configure your campaign once. Export ready-to-import briefs for Meta, Google, or TikTok.
        </p>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-6 overflow-x-auto">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className={`flex flex-col items-center gap-1 px-2 py-1 min-w-[60px] ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${
                    active ? "border-primary bg-primary/10" : done ? "border-primary/50 bg-primary/5" : "border-border"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs">{s.label}</span>
              </button>
            );
          })}
        </div>

        <Card className="p-4 sm:p-6 space-y-4">
          {/* Step 1: Goal */}
          {step === 1 && (
            <>
              <div>
                <Label>Campaign name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="My Single Launch — June"
                  style={{ fontSize: "16px" }}
                />
              </div>
              <div>
                <Label>SmartLink to promote</Label>
                <Select
                  value={form.smart_link_id}
                  onValueChange={(v) => setForm({ ...form, smart_link_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select a SmartLink" /></SelectTrigger>
                  <SelectContent>
                    {smartLinks.map((sl) => (
                      <SelectItem key={sl.id} value={sl.id}>{sl.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Ad platform</Label>
                  <Select value={form.platform} onValueChange={(v: any) => setForm({ ...form, platform: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meta">Meta (Facebook + Instagram)</SelectItem>
                      <SelectItem value="google">Google Ads</SelectItem>
                      <SelectItem value="tiktok">TikTok Ads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Objective</Label>
                  <Select value={form.objective} onValueChange={(v) => setForm({ ...form, objective: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRAFFIC">Traffic (clicks)</SelectItem>
                      <SelectItem value="CONVERSIONS">Conversions (presaves/sales)</SelectItem>
                      <SelectItem value="REACH">Reach</SelectItem>
                      <SelectItem value="VIDEO_VIEWS">Video Views</SelectItem>
                      <SelectItem value="ENGAGEMENT">Engagement</SelectItem>
                      <SelectItem value="APP_INSTALLS">App Installs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Audience */}
          {step === 2 && (
            <>
              <div>
                <Label>Age range: {form.age_min} – {form.age_max}</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Slider
                    value={[form.age_min, form.age_max]}
                    min={13} max={65} step={1}
                    onValueChange={(v) => setForm({ ...form, age_min: v[0], age_max: v[1] })}
                  />
                </div>
              </div>
              <div>
                <Label>Gender</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {[
                    { v: "all", l: "All" },
                    { v: "female", l: "Female" },
                    { v: "male", l: "Male" },
                  ].map((g) => (
                    <Button
                      key={g.v}
                      type="button"
                      variant={form.genders.includes(g.v) ? "default" : "outline"}
                      onClick={() => {
                        if (g.v === "all") setForm({ ...form, genders: ["all"] });
                        else {
                          const without = form.genders.filter((x) => x !== "all");
                          setForm({ ...form, genders: without.includes(g.v) ? without.filter((x) => x !== g.v) : [...without, g.v] });
                        }
                      }}
                      className="min-h-[44px]"
                    >
                      {g.l}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Countries</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {COUNTRIES.map((c) => (
                    <Badge
                      key={c}
                      variant={form.countries.includes(c) ? "default" : "outline"}
                      className="cursor-pointer min-h-[32px] px-3"
                      onClick={() => setForm({ ...form, countries: toggle(form.countries, c) })}
                    >
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>Interests (comma-separated)</Label>
                <Input
                  value={form.interests}
                  onChange={(e) => setForm({ ...form, interests: e.target.value })}
                  placeholder="indie music, Spotify, concert tickets"
                  style={{ fontSize: "16px" }}
                />
              </div>
              <div>
                <Label>Behaviors (comma-separated)</Label>
                <Input
                  value={form.behaviors}
                  onChange={(e) => setForm({ ...form, behaviors: e.target.value })}
                  placeholder="Engaged shoppers, Music streaming"
                  style={{ fontSize: "16px" }}
                />
              </div>
              <div>
                <Label>Languages (comma-separated codes)</Label>
                <Input
                  value={form.languages}
                  onChange={(e) => setForm({ ...form, languages: e.target.value })}
                  placeholder="en, es"
                  style={{ fontSize: "16px" }}
                />
              </div>
              <div>
                <Label>Placements</Label>
                <div className="space-y-2 mt-2">
                  {PLACEMENTS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 min-h-[36px]">
                      <Checkbox
                        checked={form.placements.includes(p.key)}
                        onCheckedChange={() => setForm({ ...form, placements: toggle(form.placements, p.key) })}
                      />
                      <span className="text-sm">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 3: Budget */}
          {step === 3 && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Daily budget (USD) *</Label>
                  <Input
                    type="number" min={1}
                    value={form.daily_budget}
                    onChange={(e) => setForm({ ...form, daily_budget: Number(e.target.value) })}
                    style={{ fontSize: "16px" }}
                  />
                </div>
                <div>
                  <Label>Lifetime budget (optional)</Label>
                  <Input
                    type="number" min={0}
                    value={form.total_budget}
                    onChange={(e) => setForm({ ...form, total_budget: Number(e.target.value) })}
                    style={{ fontSize: "16px" }}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Start date</Label>
                  <Input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    style={{ fontSize: "16px" }}
                  />
                </div>
                <div>
                  <Label>End date</Label>
                  <Input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    style={{ fontSize: "16px" }}
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded">
                💡 At ${form.daily_budget}/day, expect roughly{" "}
                <strong>{Math.round(form.daily_budget * 100)}–{Math.round(form.daily_budget * 300)}</strong> reach
                per day depending on targeting.
              </div>
            </>
          )}

          {/* Step 4: Creative */}
          {step === 4 && (
            <>
              <div>
                <Label>Headline (max 30 chars)</Label>
                <Input
                  value={form.headline}
                  maxLength={40}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  style={{ fontSize: "16px" }}
                />
              </div>
              <div>
                <Label>Primary text</Label>
                <Textarea
                  value={form.primary_text}
                  onChange={(e) => setForm({ ...form, primary_text: e.target.value })}
                  rows={3}
                  placeholder="🎵 New single out now. Stream on every platform →"
                  style={{ fontSize: "16px" }}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ fontSize: "16px" }}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Call-to-action button</Label>
                  <Select value={form.cta} onValueChange={(v) => setForm({ ...form, cta: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LISTEN_NOW">Listen Now</SelectItem>
                      <SelectItem value="LEARN_MORE">Learn More</SelectItem>
                      <SelectItem value="SHOP_NOW">Shop Now</SelectItem>
                      <SelectItem value="SIGN_UP">Sign Up</SelectItem>
                      <SelectItem value="DOWNLOAD">Download</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    style={{ fontSize: "16px" }}
                  />
                </div>
              </div>
              <div>
                <Label>Landing URL *</Label>
                <Input
                  value={form.landing_url}
                  onChange={(e) => setForm({ ...form, landing_url: e.target.value })}
                  style={{ fontSize: "16px" }}
                />
              </div>
            </>
          )}

          {/* Step 5: Export */}
          {step === 5 && (
            <>
              <div className="space-y-2">
                <p className="text-sm">Your campaign brief is ready. Download for{" "}
                  <strong>
                    {form.platform === "meta" ? "Meta Ads Manager" : form.platform === "google" ? "Google Ads Editor" : "TikTok Ads Manager"}
                  </strong>{" "}
                  and import. Campaign will start <strong>paused</strong> for safety.
                </p>
                <Card className="p-3 bg-muted/30">
                  <pre className="text-xs overflow-x-auto max-h-60">
                    {form.platform === "google"
                      ? buildGoogleCSV(brief)
                      : JSON.stringify(exportedBrief, null, 2)}
                  </pre>
                </Card>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleDownload} className="flex-1 min-h-[44px]">
                  <Download className="h-4 w-4 mr-2" />
                  Download {form.platform === "google" ? "CSV" : "JSON"}
                </Button>
                <Button onClick={() => handleSave("exported")} disabled={saving} variant="default" className="flex-1 min-h-[44px]">
                  <Save className="h-4 w-4 mr-2" />
                  Save & mark exported
                </Button>
              </div>
            </>
          )}

          {/* Nav */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button onClick={back} variant="ghost" disabled={step === 1} className="min-h-[44px]">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Button onClick={() => handleSave("draft")} variant="outline" disabled={saving} className="min-h-[44px]">
              <Save className="h-4 w-4 mr-1" /> Save draft
            </Button>
            {step < STEPS.length ? (
              <Button onClick={next} className="min-h-[44px]">
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : <div />}
          </div>
        </Card>
      </div>
    </div>
  );
}
