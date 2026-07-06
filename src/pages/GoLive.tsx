import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Radio, Globe, Lock, Loader2, ShoppingBag, Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
const categories = [
  "Business Strategy", "Entrepreneurship", "Personal Finance", "Investing & Trading",
  "Real Estate", "E-Commerce", "Dropshipping", "Amazon FBA", "Fitness & Nutrition",
  "Weight Loss", "Bodybuilding", "Mental Health & Wellness", "Relationships & Dating",
  "Parenting", "Spirituality & Mindset", "Music Production", "DJing", "Podcasting",
  "Content Creation", "Photography", "Videography", "Graphic Design", "UX Design",
  "Web Development", "AI & Tech", "Cybersecurity", "Gaming", "Marketing", "Copywriting",
  "Sales", "Public Speaking", "Writing", "Education & Tutoring", "Language Learning",
  "Career & Productivity", "Legal & Compliance", "Fashion & Style", "Food & Cooking",
  "Travel", "NFTs & Crypto", "Faith & Community",
];
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BroadcastStudio from "@/components/live/BroadcastStudio";
import { useProducts } from "@/hooks/useProducts";
import { useProfile } from "@/hooks/useProfile";
import EndOfStreamScreen from "@/components/live/EndOfStreamScreen";
import LiveShopSetup from "@/components/live/LiveShopSetup";
import FeaturedProductPicker, { type Product as FeaturedProductOption } from "@/components/live/FeaturedProductPicker";
import ScheduleStreamTab from "@/components/scheduled/ScheduleStreamTab";
import { trackEvent } from "@/lib/posthog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SimulcastGoLivePanel from "@/components/live/SimulcastGoLivePanel";
import { useSimulcastDestinations, useSimulcastSessions } from "@/hooks/useSimulcast";

function CategoryDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = categories.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full flex items-center justify-between bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground hover:border-primary/30 transition-colors"
          onClick={() => setOpen(!open)}
        >
          <span>{value}</span>
          <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No categories found</p>
          )}
          {filtered.map((cat) => (
            <button
              key={cat}
              onClick={() => { onChange(cat); setOpen(false); setSearch(""); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                value === cat
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-secondary/50"
              )}
            >
              {value === cat && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
              <span className={value === cat ? "" : "ml-5.5"}>{cat}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function GoLive() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"public" | "private">("public");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [isSettingUp, setIsSettingUp] = useState(false);
  type SetupStep = { step: string; status: "pending" | "ok" | "error"; ms?: number; detail?: string };
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([]);
  const [setupTraceId, setSetupTraceId] = useState<string | null>(null);
  const pushStep = (step: string, status: SetupStep["status"], detail?: string) => {
    setSetupSteps((prev) => {
      const idx = prev.findIndex((s) => s.step === step);
      const next: SetupStep = { step, status, detail };
      if (idx >= 0) { const copy = [...prev]; copy[idx] = next; return copy; }
      return [...prev, next];
    });
     
    console.log(`[go-live] ${status === "ok" ? "✓" : status === "error" ? "✗" : "…"} ${step}`, detail ?? "");
  };
  const [featuredProductId, setFeaturedProductId] = useState<string | null>(null);
  const [ppvEnabled, setPpvEnabled] = useState(false);
  const [ppvPrice, setPpvPrice] = useState<number>(9.99);
  const [streamData, setStreamData] = useState<{
    streamId: string;
    streamKey: string;
    playbackId: string;
    rtmpUrl: string;
    slug: string;
  } | null>(null);
  const [streamStatus, setStreamStatus] = useState<string>("idle");
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [streamMuxAssetId, setStreamMuxAssetId] = useState<string | null>(null);
  const [streamStartTime, setStreamStartTime] = useState<number | null>(null);
  const [draftSessionId] = useState<string>(() => {
    const stored = localStorage.getItem("uply_draft_session_id");
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem("uply_draft_session_id", newId);
    return newId;
  });
  const [activeTab, setActiveTab] = useState("setup");

  const { data: profileData } = useProfile();
  const { data: products } = useProducts();
  const activeProducts = products?.filter(p => p.status === 'active') || [];
  const { destinations } = useSimulcastDestinations();
  const { startSimulcast, stopSimulcast } = useSimulcastSessions(streamData?.streamId || null);
  const [simulcastEnabled, setSimulcastEnabled] = useState(true);
  const [enabledPlatforms, setEnabledPlatforms] = useState<string[]>([]);
  const [liveProducts, setLiveProducts] = useState<any[]>([]);

  const allFeaturableProducts: FeaturedProductOption[] = [
    ...activeProducts.map((product: any) => ({
      id: product.id,
      name: product.name,
      type: product.type,
      price: Number(product.price ?? 0),
      image_url: product.image_url ?? null,
      status: product.status ?? "active",
      source: "digital" as const,
    })),
    ...liveProducts.map((product: any) => ({
      id: product.id,
      name: product.title,
      type: product.type === "auction" ? "auction" : "product",
      price: Number((product.type === "auction" ? product.starting_bid : product.price) ?? 0),
      image_url: product.image_url ?? null,
      status: product.is_active ? "active" : "queued",
      source: "live_shop" as const,
    })),
  ];

  const fetchLiveProducts = useCallback(async (sessionId?: string) => {
    const id = sessionId || streamData?.streamId || draftSessionId;
    if (!id || !user) return;

    // Try fetching by stream_id first (ppv_access is a virtual stream-access
    // product managed by the PPV toggle — never listed in the shop)
    const { data } = await supabase
      .from("live_products")
      .select("*")
      .eq("stream_id", id)
      .order("position");

    const shopItems = (data || []).filter((p: any) => p.type !== "ppv_access");
    if (shopItems.length > 0) {
      setLiveProducts(shopItems);
      return;
    }

    // Fallback: fetch recent draft products by creator_id
    // (catches orphaned drafts from previous sessions where localStorage was cleared)
    if (!streamData) {
      const { data: drafts } = await supabase
        .from("live_products")
        .select("*")
        .eq("creator_id", user.id)
        .eq("is_sold_out", false)
        .eq("is_active", false)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(20);
      setLiveProducts((drafts || []).filter((p: any) => p.type !== "ppv_access"));
    } else {
      setLiveProducts([]);
    }
  }, [streamData?.streamId, draftSessionId, user]);

  useEffect(() => {
    fetchLiveProducts();
  }, [fetchLiveProducts]);

  // Initialize enabled platforms from saved destinations
  useEffect(() => {
    const enabled = destinations.filter(d => d.is_enabled && d.stream_key_last_four).map(d => d.platform);
    setEnabledPlatforms(enabled);
  }, [destinations]);

  // Realtime subscription on mux_live_streams for status
  useEffect(() => {
    if (!streamData?.streamId) return;

    const channel = supabase
      .channel(`stream-status-${streamData.streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mux_live_streams',
          filter: `id=eq.${streamData.streamId}`,
        },
        (payload: any) => {
          setStreamStatus(payload.new.status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamData?.streamId]);

  const handleSetUpStream = async () => {
    if (!title.trim() || !user) return;
    setIsSettingUp(true);
    setSetupSteps([]);
    setSetupTraceId(null);
    pushStep("validate_inputs", "ok", `${orientation} · ${mode}`);
    pushStep("invoke_edge_function", "pending", "Calling mux-create-livestream…");
    try {
      const t0 = performance.now();
      const { data, error } = await supabase.functions.invoke("mux-create-livestream", {
        body: {
          userId: user.id,
          title,
          description: `${mode === "public" ? "Public" : "Members-only"} stream`,
          category,
          isPublic: mode === "public",
          orientation,
        },
      });
      const ms = Math.round(performance.now() - t0);
      if (error) {
        let realMsg = error.message || "Failed to create stream";
        let serverSteps: any[] | null = null;
        let serverTrace: string | null = null;
        try {
          const ctx: any = (error as any).context;
          let parsed: any = null;
          if (ctx?.json) parsed = await ctx.json();
          else if (ctx instanceof Response) parsed = await ctx.json();
          if (parsed?.error) realMsg = parsed.error;
          if (Array.isArray(parsed?.steps)) serverSteps = parsed.steps;
          if (parsed?.traceId) serverTrace = parsed.traceId;
        } catch { /* ignore */ }
        pushStep("invoke_edge_function", "error", `${realMsg} (${ms}ms)`);
        if (serverTrace) setSetupTraceId(serverTrace);
        if (serverSteps) {
          serverSteps.forEach((s: any) =>
            pushStep(`server:${s.step}`, s.status === "error" ? "error" : "ok",
              s.detail ? JSON.stringify(s.detail).slice(0, 120) : undefined)
          );
        }
        throw new Error(realMsg);
      }
      if (!data?.streamId) throw new Error("Stream creation returned no streamId");

      pushStep("invoke_edge_function", "ok", `Stream created (${ms}ms)`);
      if (data?.traceId) setSetupTraceId(data.traceId);
      if (Array.isArray(data?.steps)) {
        data.steps.forEach((s: any) =>
          pushStep(`server:${s.step}`, s.status === "error" ? "error" : "ok",
            typeof s.ms === "number" ? `+${s.ms}ms` : undefined)
        );
      }

      if (featuredProductId && data?.streamId) {
        pushStep("attach_featured_product", "pending");
        const isLiveShop = liveProducts.some((p: any) => p.id === featuredProductId);
        const { error: featErr } = await supabase
          .from('mux_live_streams')
          .update({
            featured_product_id: featuredProductId,
            featured_product_source: isLiveShop ? "live_shop" : "digital",
          } as any)
          .eq('id', data.streamId);
        pushStep("attach_featured_product", featErr ? "error" : "ok", featErr?.message);
      }

      if (data?.streamId && user) {
        pushStep("migrate_draft_products", "pending");
        try {
          if (draftSessionId) {
            await supabase
              .from("live_products")
              .update({ stream_id: data.streamId })
              .eq("stream_id", draftSessionId);
          }
          const { data: orphans } = await supabase
            .from("live_products")
            .select("id, stream_id")
            .eq("creator_id", user.id)
            .eq("is_sold_out", false)
            .eq("is_active", false)
            .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
          if (orphans && orphans.length > 0) {
            const orphanIds = orphans
              .filter((o: any) => o.stream_id !== data.streamId)
              .map((o: any) => o.id);
            if (orphanIds.length > 0) {
              await supabase
                .from("live_products")
                .update({ stream_id: data.streamId })
                .in("id", orphanIds);
            }
          }
          fetchLiveProducts(data.streamId);
          try { localStorage.removeItem("uply_draft_session_id"); } catch {}
          pushStep("migrate_draft_products", "ok");
        } catch (e: any) {
          pushStep("migrate_draft_products", "error", e?.message);
        }
      }

      // Pay-per-view: flag the stream and create the virtual access product.
      // Purchases run through stripe-create-live-purchase (purchase_type
      // "live_product"), which the existing stripe-webhook finalizes — the
      // 95/5 split and wallet credit are handled with no webhook changes.
      const ppvActive = mode === "public" && ppvEnabled && ppvPrice >= 1;
      if (ppvActive && data?.streamId) {
        pushStep("enable_ppv", "pending", `$${ppvPrice.toFixed(2)}`);
        try {
          const { error: ppvErr } = await (supabase.from("mux_live_streams") as any)
            .update({ is_ppv: true, ppv_price: ppvPrice })
            .eq("id", data.streamId);
          if (ppvErr) throw ppvErr;
          const { error: prodErr } = await supabase.from("live_products").insert({
            stream_id: data.streamId,
            creator_id: user.id,
            title: `Stream Access — ${title}`,
            description: "Pay-per-view access to this live stream and its full replay",
            price: ppvPrice,
            type: "ppv_access",
            quantity_total: 1000000,
            quantity_remaining: 1000000,
            is_active: false,
            position: 9999,
          } as any);
          if (prodErr) throw prodErr;
          pushStep("enable_ppv", "ok");
        } catch (ppvE: any) {
          pushStep("enable_ppv", "error", ppvE?.message);
          toast.error("PPV setup failed", { description: "Stream created, but pay-per-view could not be enabled. Viewers can watch free." });
        }
      }

      setStreamData(data);
      setStreamStatus("idle");
      setStreamStartTime(Date.now());
      trackEvent("stream_created", { mode, category, orientation, has_featured_product: !!featuredProductId, simulcast: simulcastEnabled, ppv: ppvActive, ppv_price: ppvActive ? ppvPrice : 0, total_ms: ms });
      trackEvent("stream_started", { mode, category, orientation, simulcast: simulcastEnabled });
      pushStep("ready", "ok", "Broadcast studio ready");
      toast.success("Stream created!", { description: "Your broadcast studio is ready." });

      if (simulcastEnabled && enabledPlatforms.length > 0 && data?.streamId) {
        pushStep("start_simulcast", "pending", `${enabledPlatforms.length} destinations`);
        startSimulcast(data.streamId, user.id)
          .then(() => pushStep("start_simulcast", "ok"))
          .catch((e: any) => pushStep("start_simulcast", "error", e?.message));
      }
    } catch (e: any) {
      toast.error("Setup failed", { description: e.message || "Failed to create stream" });
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleEndStream = (info?: { muxAssetId?: string; durationSeconds?: number }) => {
    const duration = info?.durationSeconds ?? (streamStartTime ? Math.floor((Date.now() - streamStartTime) / 1000) : 0);
    setStreamDuration(duration);
    setStreamMuxAssetId(info?.muxAssetId || null);
    setShowEndScreen(true);
    // Stop simulcast non-blocking
    if (streamData?.streamId && user) {
      stopSimulcast(streamData.streamId, user.id).catch(() => {});
    }
  };

  return (
    <AppLayout>
      <div className="px-4 md:px-8 py-6 md:py-8 max-w-3xl mx-auto mobile-safe-content">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Radio className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Go Live</h1>
              <p className="text-sm text-muted-foreground">
                {streamData ? "Broadcast Studio" : "Start streaming to your audience"}
              </p>
            </div>
          </div>

          {!streamData ? (
            <Tabs value={activeTab} onValueChange={(val) => {
              setActiveTab(val);
              if (val === "shop") {
                fetchLiveProducts(streamData?.streamId || draftSessionId);
              }
            }} className="space-y-6">
              <TabsList className="w-full">
                <TabsTrigger value="setup" className="flex-1">Stream Setup</TabsTrigger>
                <TabsTrigger value="schedule" className="flex-1">📅 Schedule</TabsTrigger>
                <TabsTrigger value="shop" className="flex-1 relative">
                  🛍️ Shop
                  {liveProducts.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                      {liveProducts.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="setup" className="space-y-6">
              {/* Stream Mode */}
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">Stream Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode("public")}
                    className={`glass-card p-4 text-left transition-all ${
                      mode === "public" ? "glow-border" : "hover:border-primary/20"
                    }`}
                  >
                    <Globe className={`w-5 h-5 mb-2 ${mode === "public" ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-semibold text-sm text-foreground">Public Stream</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Visible to everyone. Great for discovery & growing your community.
                    </p>
                  </button>
                  <button
                    onClick={() => setMode("private")}
                    className={`glass-card p-4 text-left transition-all ${
                      mode === "private" ? "glow-border" : "hover:border-primary/20"
                    }`}
                  >
                    <Lock className={`w-5 h-5 mb-2 ${mode === "private" ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="font-semibold text-sm text-foreground">Members Only</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Exclusive for paid members. Q&A, coaching, masterminds.
                    </p>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Stream Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What are you streaming about?"
                  className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
                <CategoryDropdown value={category} onChange={setCategory} />
              </div>

              {/* Stream Orientation */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Stream Format</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setOrientation('landscape')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[44px]",
                      orientation === 'landscape'
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/30 text-muted-foreground"
                    )}
                  >
                    <div className="w-12 h-7 rounded border-2 border-current" />
                    <span className="text-xs font-semibold">Landscape</span>
                    <span className="text-xs opacity-70">16:9 · Twitch / Kick / YouTube Live</span>
                  </button>
                  <button
                    onClick={() => setOrientation('portrait')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-h-[44px]",
                      orientation === 'portrait'
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/30 text-muted-foreground"
                    )}
                  >
                    <div className="w-7 h-12 rounded border-2 border-current" />
                    <span className="text-xs font-semibold">Portrait</span>
                    <span className="text-xs opacity-70">9:16 · TikTok / Whatnot Live</span>
                  </button>
                </div>
                {orientation === 'landscape' && (
                  <p className="text-xs text-muted-foreground">
                    Best for entertainment streams — gaming, talk, music, concerts. Plays on TV apps.
                  </p>
                )}
                {orientation === 'portrait' && (
                  <p className="text-xs text-muted-foreground">
                    Best for live commerce — product drops, hauls, demos. Mobile only.
                  </p>
                )}
              </div>

              {/* Pay-Per-View — public streams only (members-only streams gate by subscription) */}
              {mode === "public" && (
                <div className="glass-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                        🎟️ Pay-Per-View
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">95% payout</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Charge a one-time fee to watch. Buyers get the live stream and the full replay.
                      </p>
                    </div>
                    <button
                      onClick={() => setPpvEnabled(v => !v)}
                      role="switch"
                      aria-checked={ppvEnabled}
                      className={cn(
                        "relative w-11 h-6 rounded-full transition-colors flex-shrink-0",
                        ppvEnabled ? "bg-primary" : "bg-secondary"
                      )}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                        ppvEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                      )} />
                    </button>
                  </div>
                  {ppvEnabled && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-secondary/50 border border-border rounded-xl px-3 flex-1">
                        <span className="text-sm text-muted-foreground mr-1">$</span>
                        <input
                          type="number"
                          min={1}
                          step={0.01}
                          value={ppvPrice}
                          onChange={(e) => setPpvPrice(parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent text-sm text-foreground py-3 focus:outline-none"
                          placeholder="9.99"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground flex-shrink-0">
                        You earn ${(Math.max(ppvPrice, 0) * 0.95).toFixed(2)} per viewer
                      </p>
                    </div>
                  )}
                  {ppvEnabled && ppvPrice < 1 && (
                    <p className="text-xs text-destructive">Minimum price is $1.00</p>
                  )}
                </div>
              )}

              {/* Featured Product Selector */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  Feature a Product
                  <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </label>
                {allFeaturableProducts.length > 0 ? (
                  <FeaturedProductPicker
                    products={allFeaturableProducts}
                    featuredProductId={featuredProductId}
                    onSelect={setFeaturedProductId}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground py-2">No products yet. Add one in the Shop tab or Products page.</p>
                )}
              </div>

              {/* Simulcast Panel */}
              <SimulcastGoLivePanel
                username={profileData?.display_name}
                enabledPlatforms={enabledPlatforms}
                onTogglePlatform={(platform, enabled) => {
                  setEnabledPlatforms(prev => enabled ? [...prev, platform] : prev.filter(p => p !== platform));
                }}
                simulcastEnabled={simulcastEnabled}
                onSimulcastToggle={setSimulcastEnabled}
              />

              {/* Set Up Stream Button */}
              <Button
                variant="hero"
                size="xl"
                onClick={handleSetUpStream}
                disabled={!title.trim() || isSettingUp}
                className="w-full"
              >
                {isSettingUp ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Setting Up Stream...</>
                ) : (
                  <><Radio className="w-5 h-5 mr-2" /> Set Up Stream</>
                )}
              </Button>

              {(isSettingUp || setupSteps.length > 0) && (
                <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-foreground">Setup trace</span>
                    {setupTraceId && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[60%]" title={setupTraceId}>
                        id: {setupTraceId.slice(0, 8)}…
                      </span>
                    )}
                  </div>
                  {setupSteps.map((s, i) => (
                    <div key={`${s.step}-${i}`} className="flex items-start gap-2">
                      <span className={cn(
                        "mt-0.5 inline-block w-3 text-center",
                        s.status === "ok" && "text-primary",
                        s.status === "error" && "text-destructive",
                        s.status === "pending" && "text-muted-foreground animate-pulse"
                      )}>
                        {s.status === "ok" ? "✓" : s.status === "error" ? "✗" : "…"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          "text-foreground",
                          s.status === "error" && "text-destructive"
                        )}>
                          {s.step.replace(/^server:/, "↳ ")}
                        </span>
                        {s.detail && (
                          <span className="text-muted-foreground ml-2 break-all">{s.detail}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Your stream will be automatically recorded and saved to your content library.
              </p>
              </TabsContent>
              <TabsContent value="schedule">
                <ScheduleStreamTab />
              </TabsContent>
              <TabsContent value="shop">
                <LiveShopSetup
                  streamId={streamData?.streamId || draftSessionId}
                  products={liveProducts}
                  onProductsChange={() => fetchLiveProducts(streamData?.streamId || draftSessionId)}
                  isStreamActive={!!streamData}
                  onGoToStreamSetup={() => setActiveTab("setup")}
                />
              </TabsContent>
            </Tabs>
          ) : showEndScreen && streamData ? (
            <EndOfStreamScreen
              streamId={streamData.streamId}
              creatorId={user?.id || ""}
              streamTitle={title}
              playbackId={streamData.playbackId}
              muxAssetId={streamMuxAssetId}
              durationSeconds={streamDuration}
              onClose={() => {
                setShowEndScreen(false);
                setStreamData(null);
                navigate("/dashboard");
              }}
              username={profileData?.username || null}
              streamSlug={streamData.slug}
            />
          ) : (
            <BroadcastStudio
              streamData={streamData}
              streamStatus={streamStatus}
              title={title}
              orientation={orientation}
              onEndStream={handleEndStream}
              products={[
                ...activeProducts.map((p: any) => ({
                  id: p.id, name: p.name, type: p.type, price: p.price,
                  image_url: (p as any).image_url || null, status: p.status,
                  source: "digital" as const,
                })),
                ...liveProducts.map((p: any) => ({
                  id: p.id, name: p.title,
                  type: p.type === "auction" ? "auction" : "product",
                  price: p.type === "auction" ? (p.starting_bid || 0) : p.price,
                  image_url: p.image_url || null, status: "active",
                  source: "live_shop" as const,
                })),
              ]}
              featuredProductId={featuredProductId}
              creatorUsername={profileData?.username || null}
              hasQueuedShopProducts={liveProducts.length > 0}
              onFeaturedProductChange={async (productId) => {
                setFeaturedProductId(productId);
                if (streamData && productId) {
                  const isLiveShopProduct = liveProducts.some((p: any) => p.id === productId);
                  await supabase
                    .from('mux_live_streams')
                    .update({
                      featured_product_id: productId,
                      featured_product_source: isLiveShopProduct ? "live_shop" : "digital",
                    } as any)
                    .eq('id', streamData.streamId);
                } else if (streamData && !productId) {
                  await supabase
                    .from('mux_live_streams')
                    .update({ featured_product_id: null, featured_product_source: null } as any)
                    .eq('id', streamData.streamId);
                }
              }}
            />
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
