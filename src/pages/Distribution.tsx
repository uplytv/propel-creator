import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, CheckCircle2, Zap, Loader2, Copy, Rss, Share2, Info, Radio, BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

type ConnType = "oauth" | "rtmp" | "rss";

interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: ConnType;
  contentTypes: string[];
  desc: string;
  rtmpUrl?: string;
  setupSteps?: string[];
}

const UPLY_RTMP_URL = "rtmps://global-live.mux.com:443/app";

const PLATFORMS: Platform[] = [
  // Real OAuth integrations
  { id: "youtube", name: "YouTube", icon: "▶", color: "#FF0000", type: "oauth", contentTypes: ["video", "shorts", "live"], desc: "Real OAuth — videos, Shorts & live auto-publish" },
  { id: "twitch", name: "Twitch", icon: "⬡", color: "#9146FF", type: "oauth", contentTypes: ["live"], desc: "Real OAuth — live stream metadata sync" },

  // Manual RTMP (no real OAuth — creator pastes UPLY's RTMP into their platform)
  {
    id: "tiktok", name: "TikTok", icon: "♪", color: "#010101", type: "rtmp", contentTypes: ["live"],
    desc: "Manual RTMP — paste UPLY's URL into TikTok LIVE Studio",
    setupSteps: [
      "Open TikTok LIVE Studio on desktop",
      "Click 'Go Live' → choose 'Streaming Software'",
      "Paste the UPLY RTMP URL below into the 'Server URL' field",
      "Paste your stream key into the 'Stream Key' field",
      "Click 'Start Stream' — your UPLY broadcast will mirror to TikTok",
    ],
  },
  {
    id: "instagram", name: "Instagram", icon: "◻", color: "#E1306C", type: "rtmp", contentTypes: ["live"],
    desc: "Manual RTMP — Instagram Live Producer required",
    setupSteps: [
      "Go to Instagram → Live Producer (web only)",
      "Copy the Server URL & Stream Key Instagram gives you",
      "In Go Live → Simulcast on UPLY, add Instagram as a destination",
      "Paste Instagram's RTMP URL & key into UPLY",
      "When you go live on UPLY, it will simulcast to Instagram",
    ],
  },
  {
    id: "facebook", name: "Facebook", icon: "f", color: "#1877F2", type: "rtmp", contentTypes: ["live"],
    desc: "Manual RTMP — paste UPLY's URL into Facebook Live",
    setupSteps: [
      "Go to Facebook → Live Producer",
      "Choose 'Streaming Software' as your source",
      "Copy the Server URL & Stream Key Facebook generates",
      "Add Facebook as a simulcast destination in UPLY's Go Live",
      "Paste Facebook's URL & key — go live once on UPLY to broadcast everywhere",
    ],
  },
  {
    id: "twitter", name: "X / Twitter", icon: "𝕏", color: "#1DA1F2", type: "rtmp", contentTypes: ["live"],
    desc: "Manual RTMP — X Media Studio required",
    setupSteps: [
      "Open X Media Studio → Producer",
      "Create a new broadcast — copy RTMP URL & key",
      "Add X as a simulcast destination in UPLY",
      "Paste X's RTMP URL & key into UPLY",
      "Going live on UPLY will mirror to X",
    ],
  },
  {
    id: "kick", name: "Kick", icon: "K", color: "#53FC18", type: "rtmp", contentTypes: ["live"],
    desc: "Manual RTMP — paste your Kick stream key",
    setupSteps: [
      "Open Kick → Settings → Stream Key",
      "Copy your Kick stream key",
      "Add Kick as a simulcast destination in UPLY's Go Live",
      "Paste Kick's RTMP URL (rtmps://fa723fc1b171.global-contribute.live-video.net/app) and key",
      "Go live on UPLY — it auto-mirrors to Kick",
    ],
  },
  {
    id: "linkedin", name: "LinkedIn", icon: "in", color: "#0A66C2", type: "rtmp", contentTypes: ["live"],
    desc: "Manual RTMP — LinkedIn Live (approval required)",
    setupSteps: [
      "Apply for LinkedIn Live access at linkedin.com/help/linkedin/answer/100224",
      "Once approved, create a LinkedIn Live event",
      "Copy the Server URL & Stream Key from LinkedIn",
      "Add LinkedIn as a simulcast destination in UPLY",
      "Going live on UPLY will broadcast to LinkedIn",
    ],
  },

  // RSS-based
  { id: "spotify_podcast", name: "Spotify Podcast", icon: "🎵", color: "#1DB954", type: "rss", contentTypes: ["audio"], desc: "RSS feed — auto-publishes recordings as episodes" },
  { id: "apple_podcasts", name: "Apple Podcasts", icon: "🎙", color: "#9333EA", type: "rss", contentTypes: ["audio"], desc: "RSS feed — submit once, auto-updates forever" },
];

const RULES = [
  { icon: "🎬", label: "Full Videos", desc: "→ YouTube (OAuth)" },
  { icon: "📡", label: "Live Streams", desc: "→ YouTube (OAuth) + any RTMP-configured platform" },
  { icon: "🎙️", label: "Podcast / Audio", desc: "→ Spotify, Apple Podcasts via RSS" },
  { icon: "📝", label: "Manual RTMP", desc: "TikTok, Instagram, Facebook, X, Kick, LinkedIn — configure in Go Live" },
];

export default function Distribution() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [oauthConnected, setOauthConnected] = useState<Set<string>>(new Set());
  const [rtmpConfigured, setRtmpConfigured] = useState<Set<string>>(new Set());
  const [connecting, setConnecting] = useState<string | null>(null);
  const [tab, setTab] = useState<"platforms" | "rules">("platforms");
  const [setupPlatform, setSetupPlatform] = useState<Platform | null>(null);
  const [streamKey, setStreamKey] = useState<string | null>(null);

  const username = (profile as any)?.username;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const rssUrl = username && supabaseUrl ? `${supabaseUrl}/functions/v1/podcast-rss?username=${username}` : null;

  useEffect(() => {
    if (!user) return;
    // Real OAuth connections (only YouTube/Twitch are valid)
    supabase.from("creator_platform_connections" as any)
      .select("platform_id")
      .eq("creator_id", user.id)
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) {
          const oauth = new Set<string>();
          (data as any[]).forEach((r: any) => {
            if (r.platform_id === "youtube" || r.platform_id === "twitch") oauth.add(r.platform_id);
          });
          setOauthConnected(oauth);
        }
      });

    // RTMP configured destinations from simulcast settings
    supabase.from("creator_stream_destinations" as any)
      .select("platform, is_enabled")
      .eq("creator_id", user.id)
      .eq("is_enabled", true)
      .then(({ data }) => {
        if (data) setRtmpConfigured(new Set((data as any[]).map((r: any) => r.platform)));
      });
  }, [user]);

  const openSetup = async (p: Platform) => {
    setSetupPlatform(p);
    if (!streamKey && user) {
      const { data: latest } = await supabase
        .from("mux_live_streams")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest?.id) {
        const { data: key } = await supabase.rpc("get_my_stream_key", { p_stream_id: latest.id });
        if (key) setStreamKey(key as unknown as string);
      }
    }
  };

  const connectOAuth = async (p: Platform) => {
    setConnecting(p.id);
    try {
      await supabase.from("creator_platform_connections" as any).upsert(
        { creator_id: user!.id, platform_id: p.id, is_active: true, connected_at: new Date().toISOString() },
        { onConflict: "creator_id,platform_id" }
      );
      setOauthConnected(prev => new Set([...prev, p.id]));
      toast.success(`${p.name} connected via OAuth`);
    } catch {
      toast.error("Connection failed");
    }
    setConnecting(null);
  };

  const disconnectOAuth = async (p: Platform) => {
    await supabase.from("creator_platform_connections" as any).delete().eq("creator_id", user!.id).eq("platform_id", p.id);
    setOauthConnected(prev => { const n = new Set(prev); n.delete(p.id); return n; });
    toast.success(`${p.name} disconnected`);
  };

  const copyRss = async (p: Platform) => {
    if (!rssUrl) { toast.error("Set a username first"); return; }
    await navigator.clipboard.writeText(rssUrl);
    toast.success("RSS URL copied!", { description: `Paste into ${p.name} to connect` });
  };

  const oauthCount = oauthConnected.size;
  const rtmpCount = rtmpConfigured.size;

  const renderBadge = (p: Platform) => {
    if (p.type === "oauth") {
      return oauthConnected.has(p.id)
        ? <span className="flex items-center gap-0.5 text-[10px] text-primary font-semibold"><CheckCircle2 className="w-3 h-3" /> OAuth Connected</span>
        : <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-primary/15 text-primary uppercase">OAuth</span>;
    }
    if (p.type === "rtmp") {
      return rtmpConfigured.has(p.id)
        ? <span className="flex items-center gap-0.5 text-[10px] text-foreground font-semibold"><Radio className="w-3 h-3" /> RTMP Configured</span>
        : <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-muted text-muted-foreground uppercase">Manual RTMP</span>;
    }
    return <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-muted text-muted-foreground uppercase">RSS</span>;
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto pb-20 md:pb-8 mobile-safe-content">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 md:px-8 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Content Syndication</h1>
              <p className="text-sm text-muted-foreground">Publish once on UPLY. Reach everywhere.</p>
            </div>
          </div>
        </motion.div>

        {/* Honest stats */}
        <div className="px-4 md:px-8 mb-4">
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card text-center">
            <div className="flex-1">
              <p className="text-xl font-bold text-primary">{oauthCount}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">OAuth Connected</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex-1">
              <p className="text-xl font-bold text-foreground">{rtmpCount}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">RTMP Configured</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex-1">
              <p className="text-xl font-bold text-foreground">{PLATFORMS.length}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Available</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-8 mb-4 flex gap-2">
          {[{ id: "platforms" as const, label: "Platforms" }, { id: "rules" as const, label: "Distribution Rules" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t.label}</button>
          ))}
        </div>

        {/* Platforms */}
        {tab === "platforms" && (
          <div className="px-4 md:px-8 space-y-3">
            {PLATFORMS.map((p, i) => {
              const isOauthConn = p.type === "oauth" && oauthConnected.has(p.id);
              const isRtmpConn = p.type === "rtmp" && rtmpConfigured.has(p.id);
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between p-4 gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0" style={{ background: `${p.color}18`, color: p.color }}>{p.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{p.name}</p>
                          {renderBadge(p)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                        <div className="flex flex-wrap gap-1 mt-1">{p.contentTypes.map(ct => <span key={ct} className="px-1.5 py-0.5 rounded text-[9px] bg-muted text-muted-foreground">{ct}</span>)}</div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {p.type === "oauth" ? (
                        isOauthConn ? (
                          <button onClick={() => disconnectOAuth(p)} className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive border border-border hover:border-destructive/30 transition-all">Disconnect</button>
                        ) : (
                          <Button size="sm" onClick={() => connectOAuth(p)} disabled={connecting === p.id} className="gap-1.5 min-h-[44px] text-xs">
                            {connecting === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Share2 className="w-3.5 h-3.5" /> Connect</>}
                          </Button>
                        )
                      ) : p.type === "rtmp" ? (
                        <Button size="sm" variant={isRtmpConn ? "outline" : "default"} onClick={() => openSetup(p)} className="gap-1.5 min-h-[44px] text-xs">
                          <BookOpen className="w-3.5 h-3.5" /> {isRtmpConn ? "View Setup" : "Setup Guide"}
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => copyRss(p)} className="gap-1.5 min-h-[44px] text-xs">
                          <Copy className="w-3.5 h-3.5" /> Copy RSS
                        </Button>
                      )}
                    </div>
                  </div>

                  {p.type === "rss" && rssUrl && (
                    <div className="px-4 pb-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Rss className="w-3 h-3 text-primary shrink-0" />
                      <span className="truncate font-mono">{rssUrl}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Rules */}
        {tab === "rules" && (
          <div className="px-4 md:px-8 space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">How distribution actually works</h3>
              {RULES.map((r, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                  <span className="text-lg">{r.icon}</span>
                  <div className="flex-1"><p className="text-sm font-medium text-foreground">{r.label}</p><p className="text-xs text-muted-foreground">{r.desc}</p></div>
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <Info className="w-5 h-5 text-primary mb-2" />
              <p className="text-sm font-semibold text-foreground">Honest about what's automated</p>
              <p className="text-xs text-muted-foreground mt-1">
                Only YouTube and Twitch use real OAuth APIs. Every other live destination (TikTok, Instagram, Facebook, X, Kick, LinkedIn) requires you to paste UPLY's RTMP credentials into that platform's broadcasting settings — but once configured, going live on UPLY mirrors to all of them simultaneously.
              </p>
            </div>
          </div>
        )}

        {/* Setup Drawer */}
        {setupPlatform && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setSetupPlatform(null)}>
            <div onClick={e => e.stopPropagation()} className="w-full md:max-w-lg bg-card border border-border rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: `${setupPlatform.color}18`, color: setupPlatform.color }}>{setupPlatform.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{setupPlatform.name} Setup</p>
                    <p className="text-[11px] text-muted-foreground">Manual RTMP configuration</p>
                  </div>
                </div>
                <button onClick={() => setSetupPlatform(null)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* RTMP Credentials */}
                <div className="rounded-xl border border-border bg-background p-3 space-y-3">
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">UPLY RTMP URL</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono bg-muted px-2 py-2 rounded break-all">{UPLY_RTMP_URL}</code>
                      <button onClick={() => { navigator.clipboard.writeText(UPLY_RTMP_URL); toast.success("RTMP URL copied"); }} className="min-h-[44px] px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">Copy</button>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Your Stream Key</p>
                    {streamKey ? (
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs font-mono bg-muted px-2 py-2 rounded break-all">{streamKey}</code>
                        <button onClick={() => { navigator.clipboard.writeText(streamKey); toast.success("Stream key copied"); }} className="min-h-[44px] px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">Copy</button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Go live once on UPLY first to generate a stream key.</p>
                    )}
                  </div>
                </div>

                {/* Steps */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Step-by-step</p>
                  <ol className="space-y-2">
                    {(setupPlatform.setupSteps || []).map((step, i) => (
                      <li key={i} className="flex gap-3 text-xs text-muted-foreground">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-[10px]">{i + 1}</span>
                        <span className="pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <p className="text-[11px] text-muted-foreground">
                    <Info className="w-3.5 h-3.5 inline text-primary mr-1" />
                    Manage RTMP destinations in <strong className="text-foreground">Go Live → Simulcast settings</strong>. UPLY will automatically broadcast to every configured platform when you go live.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
