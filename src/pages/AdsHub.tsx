import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Target, Activity, Plus, ExternalLink, Zap, BarChart3, Link2, ShieldCheck, AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCampaigns } from "@/hooks/useCampaigns";
import SEOHead from "@/components/SEOHead";
import PixelSetupWizard, { type AdPlatform } from "@/components/ads/PixelSetupWizard";

type TabId = "campaigns" | "attribution" | "pixels";

interface AdIntegration {
  id: string;
  platform: string;
  pixel_id: string;
  is_active: boolean;
}

interface ClickRow {
  platform: string;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: string;
}

const PLATFORM_META: Record<string, { label: string; color: string; helpUrl: string }> = {
  meta: { label: "Meta (Facebook & Instagram)", color: "#1877F2", helpUrl: "https://www.facebook.com/business/help/952192354843755" },
  tiktok: { label: "TikTok Ads", color: "#000000", helpUrl: "https://ads.tiktok.com/help/article/get-started-pixel" },
  google: { label: "Google Ads", color: "#FBBC04", helpUrl: "https://support.google.com/google-ads/answer/6095821" },
  snapchat: { label: "Snapchat Ads", color: "#FFFC00", helpUrl: "https://businesshelp.snapchat.com/s/article/snap-pixel-about" },
};

export default function AdsHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("campaigns");
  const [pixels, setPixels] = useState<AdIntegration[]>([]);
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [loadingPixels, setLoadingPixels] = useState(true);
  const [wizardPlatform, setWizardPlatform] = useState<AdPlatform | null>(null);
  const { campaigns, isLoading: loadingCampaigns } = useCampaigns();

  const reloadPixels = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ad_integrations")
      .select("id, platform, pixel_id, is_active")
      .eq("user_id", user.id);
    if (data) setPixels(data as AdIntegration[]);
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [pxRes, ckRes] = await Promise.all([
        supabase.from("ad_integrations").select("id, platform, pixel_id, is_active").eq("user_id", user.id),
        supabase
          .from("smart_link_clicks" as any)
          .select("platform, utm_source, utm_campaign, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      if (cancelled) return;
      if (pxRes.data) setPixels(pxRes.data as any);
      if (ckRes.data) setClicks(ckRes.data as any);
      setLoadingPixels(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // ---- Attribution math (Hyros-style) ----
  const attribution = useMemo(() => {
    const total = clicks.length;
    const paid = clicks.filter(c => c.utm_source && /facebook|instagram|tiktok|google|meta|fb|ig/i.test(c.utm_source)).length;
    const organic = total - paid;
    const bySource = new Map<string, number>();
    clicks.forEach(c => {
      const key = (c.utm_source || c.platform || "direct").toLowerCase();
      bySource.set(key, (bySource.get(key) || 0) + 1);
    });
    const topSources = Array.from(bySource.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return { total, paid, organic, topSources };
  }, [clicks]);

  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const totalSpent = campaigns.reduce((s, c) => s + Number(c.spent || 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + Number(c.conversions || 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + Number(c.impressions || 0), 0);

  return (
    <AppLayout>
      <SEOHead title="Ads — UPLY" description="Run paid campaigns and track every click from ad → presave → sale." />
      <div className="max-w-5xl mx-auto pb-20 md:pb-8 mobile-safe-content">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 md:px-8 pt-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Ads</h1>
                  <Badge variant="outline" className="text-[10px] uppercase">Beta</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Run campaigns and track every click — like ToneDen + Hyros, in one tab.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Top KPI strip */}
        <div className="px-4 md:px-8 mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          <Kpi label="Active campaigns" value={activeCampaigns.length} icon={Zap} />
          <Kpi label="Total spent" value={`$${totalSpent.toFixed(0)}`} icon={Target} />
          <Kpi label="Conversions" value={totalConversions} icon={Sparkles} />
          <Kpi label="Pixels live" value={pixels.filter(p => p.is_active).length} icon={ShieldCheck} />
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-8 mb-4 flex gap-2 overflow-x-auto">
          {([
            { id: "campaigns", label: "Campaigns", icon: Zap },
            { id: "attribution", label: "Attribution", icon: BarChart3 },
            { id: "pixels", label: "Pixels & Tracking", icon: ShieldCheck },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 min-h-[44px] px-4 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                tab === t.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* CAMPAIGNS TAB */}
        {tab === "campaigns" && (
          <div className="px-4 md:px-8 space-y-4">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h2 className="font-bold text-foreground">Launch a paid campaign</h2>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md">Pick a SmartLink, set a budget, choose your audience. UPLY ships it to Meta, TikTok, or both — and tracks every conversion server-side.</p>
                </div>
                <Button onClick={() => navigate("/smart-links/campaign")} className="shrink-0 min-h-[44px]">
                  <Plus className="w-4 h-4 mr-1.5" /> New campaign
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                {[
                  { id: "meta", label: "Meta", color: "#1877F2" },
                  { id: "tiktok", label: "TikTok", color: "#FF0050" },
                  { id: "google", label: "Google", color: "#FBBC04" },
                  { id: "snapchat", label: "Snap", color: "#FFFC00" },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/smart-links/campaign?platform=${p.id}`)}
                    className="rounded-xl border border-border bg-card hover:border-primary/40 transition-colors p-3 text-left min-h-[64px]"
                  >
                    <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold mb-1.5" style={{ background: `${p.color}22`, color: p.color }}>
                      {p.label[0]}
                    </div>
                    <p className="text-xs font-semibold">{p.label}</p>
                    <p className="text-[10px] text-muted-foreground">Quick launch</p>
                  </button>
                ))}
              </div>
            </div>

            {loadingCampaigns ? (
              <div className="space-y-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <EmptyState
                icon={Zap}
                title="No campaigns yet"
                body="Launch your first paid push from a SmartLink — UPLY handles audience matching and tracking."
                cta={{ label: "Build a campaign", onClick: () => navigate("/smart-links/campaign") }}
              />
            ) : (
              <div className="space-y-2">
                {campaigns.slice(0, 20).map(c => (
                  <div key={c.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground truncate">{c.stream_title || "Untitled"}</span>
                        <Badge variant={c.status === "active" ? "default" : "outline"} className="text-[10px] capitalize">{c.status}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{c.platform || "meta"}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        ${Number(c.daily_budget || 0).toFixed(0)}/day · {c.duration}d · {c.audience_label || c.audience}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">{c.conversions || 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">conv.</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-primary">${Number(c.spent || 0).toFixed(0)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">spent</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ATTRIBUTION TAB */}
        {tab === "attribution" && (
          <div className="px-4 md:px-8 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Kpi label="Total clicks" value={attribution.total.toLocaleString()} icon={Activity} />
              <Kpi label="From paid ads" value={attribution.paid.toLocaleString()} icon={Target} accent />
              <Kpi label="Organic" value={attribution.organic.toLocaleString()} icon={Sparkles} />
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> Top traffic sources
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Where your SmartLink visitors actually came from (UTM-attributed, last 500 clicks).</p>
              </div>
              {attribution.topSources.length === 0 ? (
                <EmptyState
                  inline
                  icon={Activity}
                  title="No clicks yet"
                  body="Once fans visit your SmartLinks, sources will appear here."
                />
              ) : (
                <div className="divide-y divide-border">
                  {attribution.topSources.map(([src, count]) => {
                    const pct = attribution.total > 0 ? Math.round((count / attribution.total) * 100) : 0;
                    return (
                      <div key={src} className="p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold text-foreground truncate capitalize">{src}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">{count} · {pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex gap-3">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-foreground">Server-side conversion tracking is on</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Every SmartLink click and presave fires through UPLY's CAPI bridge — Meta and TikTok see the conversion even when fans block pixels in their browser.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PIXELS TAB */}
        {tab === "pixels" && (
          <div className="px-4 md:px-8 space-y-4">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Connect your ad pixels
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Click any platform below for a 4-step guided setup. UPLY fires Conversions API events server-side from every SmartLink click — no copy-paste, no broken pixels.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.entries(PLATFORM_META) as [AdPlatform, typeof PLATFORM_META[keyof typeof PLATFORM_META]][]).map(([id, meta]) => {
                const conn = pixels.find(p => p.platform === id);
                const live = conn?.is_active;
                return (
                  <button
                    key={id}
                    onClick={() => setWizardPlatform(id)}
                    className="text-left rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-card/80 transition-all p-4 group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: `${meta.color}22`, color: meta.color }}>
                          {meta.label[0]}
                        </div>
                        <p className="text-sm font-semibold text-foreground truncate">{meta.label}</p>
                      </div>
                      {live ? (
                        <Badge className="text-[10px] gap-1"><ShieldCheck className="w-3 h-3" /> Ready</Badge>
                      ) : conn ? (
                        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">Saved</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Not set</Badge>
                      )}
                    </div>
                    {conn?.pixel_id ? (
                      <p className="text-[11px] text-muted-foreground font-mono truncate">{conn.pixel_id}</p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Tap to start 4-step setup</p>
                    )}
                    <div className="mt-2 text-[11px] text-primary inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {conn ? "Re-verify" : "Set up now"} <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>
                );
              })}
            </div>

            {!loadingPixels && pixels.length === 0 && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-foreground">No pixels configured yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Connect at least Meta to start measuring ROAS on every campaign.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cross-link footer */}
        <div className="px-4 md:px-8 mt-8">
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link2 className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Need somewhere to send the traffic?</p>
                <p className="text-xs text-muted-foreground">Build a SmartLink first, then run ads to it.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 min-h-[44px]" onClick={() => navigate("/smart-links")}>
              SmartLinks <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Kpi({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: any; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <p className={`text-xl font-extrabold mt-1 tabular-nums ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, cta, inline }: { icon: any; title: string; body: string; cta?: { label: string; onClick: () => void }; inline?: boolean }) {
  return (
    <div className={`text-center ${inline ? "py-8 px-4" : "py-12 px-6 rounded-2xl border border-dashed border-border bg-card/40"}`}>
      <div className="inline-flex w-12 h-12 rounded-full bg-muted items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="font-bold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{body}</p>
      {cta && (
        <Button onClick={cta.onClick} className="mt-4 min-h-[44px]">{cta.label}</Button>
      )}
    </div>
  );
}
