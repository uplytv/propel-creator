import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Radio, Globe, Lock, Loader2, ShoppingBag, X, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import ScheduleStreamTab from "@/components/scheduled/ScheduleStreamTab";
import { trackEvent } from "@/lib/posthog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SimulcastGoLivePanel from "@/components/live/SimulcastGoLivePanel";
import { useSimulcastDestinations, useSimulcastSessions } from "@/hooks/useSimulcast";

export default function GoLive() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"public" | "private">("public");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [featuredProductId, setFeaturedProductId] = useState<string | null>(null);
  const [streamData, setStreamData] = useState<{
    streamId: string;
    streamKey: string;
    playbackId: string;
    rtmpUrl: string;
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

  const fetchLiveProducts = useCallback(async (sessionId?: string) => {
    const id = sessionId || streamData?.streamId || draftSessionId;
    if (!id || !user) return;

    // Try fetching by stream_id first
    const { data } = await supabase
      .from("live_products")
      .select("*")
      .eq("stream_id", id)
      .order("position");

    if (data && data.length > 0) {
      setLiveProducts(data);
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
      setLiveProducts(drafts || []);
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
    try {
      const { data, error } = await supabase.functions.invoke("mux-create-livestream", {
        body: {
          userId: user.id,
          title,
          description: `${mode === "public" ? "Public" : "Members-only"} stream`,
          category,
          isPublic: mode === "public",
        },
      });
      if (error) throw error;

      if (featuredProductId && data?.streamId) {
        await supabase
          .from('mux_live_streams')
          .update({ featured_product_id: featuredProductId })
          .eq('id', data.streamId);
      }

      // Migrate any draft products to the real stream
      if (data?.streamId && user) {
        // Migrate by draftSessionId
        if (draftSessionId) {
          await supabase
            .from("live_products")
            .update({ stream_id: data.streamId })
            .eq("stream_id", draftSessionId);
        }
        // Also migrate any orphaned drafts by this creator (from previous sessions)
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
      }

      setStreamData(data);
      setStreamStatus("idle");
      setStreamStartTime(Date.now());
      trackEvent("stream_created", { mode, category, has_featured_product: !!featuredProductId, simulcast: simulcastEnabled });
      toast.success("Stream created!", { description: "Your broadcast studio is ready." });

      // Start simulcast non-blocking
      if (simulcastEnabled && enabledPlatforms.length > 0 && data?.streamId) {
        startSimulcast(data.streamId, user.id).catch(() => {});
      }
    } catch (e: any) {
      toast.error("Error", { description: e.message || "Failed to create stream" });
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

  const selectedProduct = activeProducts.find(p => p.id === featuredProductId);

  return (
    <AppLayout>
      <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
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
                <div className="flex gap-2 flex-wrap">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        category === cat
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/30"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Featured Product Selector */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  Feature a Product
                  <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </label>
                {selectedProduct ? (
                  <div className="glass-card p-3 flex items-center gap-3">
                    {(selectedProduct as any).image_url ? (
                      <img src={(selectedProduct as any).image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-lg">
                        {selectedProduct.type === 'course' ? '📚' : selectedProduct.type === 'community' ? '🤝' : selectedProduct.type === 'coaching' ? '🎯' : '📦'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{selectedProduct.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{selectedProduct.type} · ${selectedProduct.price}</p>
                    </div>
                    <button onClick={() => setFeaturedProductId(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : activeProducts.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {activeProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setFeaturedProductId(p.id)}
                        className="glass-card-hover p-3 w-full text-left flex items-center gap-3"
                      >
                        {(p as any).image_url ? (
                          <img src={(p as any).image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {p.type === 'course' ? '📚' : p.type === 'community' ? '🤝' : p.type === 'coaching' ? '🎯' : '📦'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{p.type} · ${p.price}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-2">No active products yet. Create one in the Products page.</p>
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
              username={profileData?.display_name}
            />
          ) : (
            <BroadcastStudio
              streamData={streamData}
              streamStatus={streamStatus}
              title={title}
              onEndStream={handleEndStream}
              products={activeProducts}
              featuredProductId={featuredProductId}
              creatorUsername={profileData?.display_name}
              hasQueuedShopProducts={liveProducts.length > 0}
              onFeaturedProductChange={async (productId) => {
                setFeaturedProductId(productId);
                if (streamData) {
                  await supabase
                    .from('mux_live_streams')
                    .update({ featured_product_id: productId })
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
