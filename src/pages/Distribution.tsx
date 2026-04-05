import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, CheckCircle2, Zap, Loader2, Copy, Rss, Share2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

const PLATFORMS = [
  { id: "youtube", name: "YouTube", icon: "▶", color: "#FF0000", type: "oauth", contentTypes: ["video", "shorts", "live"], desc: "Full videos, Shorts, live streams" },
  { id: "tiktok", name: "TikTok", icon: "♪", color: "#010101", type: "oauth", contentTypes: ["shorts", "video", "live"], desc: "Short clips and live streams" },
  { id: "instagram", name: "Instagram", icon: "◻", color: "#E1306C", type: "oauth", contentTypes: ["reels", "video", "post"], desc: "Reels, posts, and stories" },
  { id: "twitter", name: "X / Twitter", icon: "𝕏", color: "#1DA1F2", type: "oauth", contentTypes: ["video", "clip", "live"], desc: "Videos, clips, live announcements" },
  { id: "linkedin", name: "LinkedIn", icon: "in", color: "#0A66C2", type: "oauth", contentTypes: ["video", "post"], desc: "Professional videos and updates" },
  { id: "twitch", name: "Twitch", icon: "⬡", color: "#9146FF", type: "rtmp", contentTypes: ["live"], desc: "Simultaneous live via RTMP in Go Live" },
  { id: "kick", name: "Kick", icon: "K", color: "#53FC18", type: "rtmp", contentTypes: ["live"], desc: "Simultaneous live via RTMP in Go Live" },
  { id: "spotify_podcast", name: "Spotify Podcast", icon: "🎵", color: "#1DB954", type: "rss", contentTypes: ["audio"], desc: "Auto-publishes recordings as episodes" },
  { id: "apple_podcasts", name: "Apple Podcasts", icon: "🎙", color: "#9333EA", type: "rss", contentTypes: ["audio"], desc: "Submit once, auto-updates forever" },
];

const RULES = [
  { icon: "🎬", label: "Full Videos", desc: "→ YouTube, LinkedIn" },
  { icon: "⚡", label: "Short Clips", desc: "→ TikTok, Instagram Reels, X" },
  { icon: "📡", label: "Live Streams", desc: "→ YouTube, Twitch, Kick simultaneously" },
  { icon: "🎙️", label: "Podcast / Audio", desc: "→ Spotify, Apple Podcasts via RSS" },
  { icon: "📝", label: "Go Live Announcements", desc: "→ X and LinkedIn automatically" },
];

export default function Distribution() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [connecting, setConnecting] = useState<string | null>(null);
  const [tab, setTab] = useState<"platforms" | "rules">("platforms");

  const username = (profile as any)?.username;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const rssUrl = username && supabaseUrl ? `${supabaseUrl}/functions/v1/podcast-rss?username=${username}` : null;

  useEffect(() => {
    if (!user) return;
    supabase.from("creator_platform_connections" as any).select("platform_id").eq("creator_id", user.id).eq("is_active", true)
      .then(({ data }) => { if (data) setConnected(new Set((data as any[]).map((r: any) => r.platform_id))); });
  }, [user]);

  const connect = async (p: typeof PLATFORMS[0]) => {
    if (p.type === "rss") {
      if (rssUrl) { await navigator.clipboard.writeText(rssUrl); toast.success("RSS URL copied!", { description: `Paste into ${p.name} to connect` }); }
      return;
    }
    if (p.type === "rtmp") { toast.success("RTMP is configured in Go Live → Simulcast settings"); return; }
    setConnecting(p.id);
    try {
      await supabase.from("creator_platform_connections" as any).upsert({ creator_id: user!.id, platform_id: p.id, is_active: true, connected_at: new Date().toISOString() }, { onConflict: "creator_id,platform_id" });
      setConnected(prev => new Set([...prev, p.id]));
      toast.success(`${p.name} connected!`);
    } catch { toast.error("Connection failed"); }
    setConnecting(null);
  };

  const disconnect = async (p: typeof PLATFORMS[0]) => {
    await supabase.from("creator_platform_connections" as any).delete().eq("creator_id", user!.id).eq("platform_id", p.id);
    setConnected(prev => { const n = new Set(prev); n.delete(p.id); return n; });
    toast.success(`${p.name} disconnected`);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto pb-20 md:pb-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 md:px-8 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Distribution</h1>
              <p className="text-sm text-muted-foreground">Publish once on UPLY. Reach everywhere.</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="px-4 md:px-8 mb-4">
          <div className="flex items-center gap-4 p-3 rounded-xl border border-border bg-card text-center">
            <div className="flex-1">
              <p className="text-xl font-bold text-primary">{connected.size}</p>
              <p className="text-[10px] text-muted-foreground">Connected</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex-1">
              <p className="text-xl font-bold text-foreground">{PLATFORMS.length}</p>
              <p className="text-[10px] text-muted-foreground">Available</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-foreground">Zero-layer distribution</p>
              <p className="text-[10px] text-muted-foreground">UPLY is your content HQ. Everything else is downstream.</p>
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
            {PLATFORMS.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0" style={{ background: `${p.color}18`, color: p.color }}>{p.icon}</div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{p.name}</p>
                        {connected.has(p.id) && <span className="flex items-center gap-0.5 text-[10px] text-primary font-semibold"><CheckCircle2 className="w-3 h-3" /> Connected</span>}
                        {(p.type === "rtmp" || p.type === "rss") && <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-muted text-muted-foreground uppercase">{p.type}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                      <div className="flex gap-1 mt-1">{p.contentTypes.map(ct => <span key={ct} className="px-1.5 py-0.5 rounded text-[9px] bg-muted text-muted-foreground">{ct}</span>)}</div>
                    </div>
                  </div>
                  <div className="shrink-0 ml-3">
                    {connected.has(p.id) ? (
                      <button onClick={() => disconnect(p)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive border border-border hover:border-destructive/30 transition-all">Disconnect</button>
                    ) : (
                      <Button size="sm" onClick={() => connect(p)} disabled={connecting === p.id} className="gap-1.5 h-8 text-xs">
                        {connecting === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : p.type === "rss" ? <><Copy className="w-3.5 h-3.5" /> Copy RSS</> : p.type === "rtmp" ? <><Zap className="w-3.5 h-3.5" /> Configure</> : <><Share2 className="w-3.5 h-3.5" /> Connect</>}
                      </Button>
                    )}
                  </div>
                </div>

                {connected.has(p.id) && (p.id === "spotify_podcast" || p.id === "apple_podcasts") && rssUrl && (
                  <div className="px-4 pb-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Rss className="w-3 h-3 text-primary shrink-0" />
                    <span className="truncate font-mono">{rssUrl}</span>
                    <button onClick={() => { navigator.clipboard.writeText(rssUrl!); toast.success("Copied!"); }} className="text-[10px] text-primary hover:underline shrink-0">Copy</button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Rules */}
        {tab === "rules" && (
          <div className="px-4 md:px-8 space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Automatic routing by content type</h3>
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
              <div>
                <p className="text-sm font-semibold text-foreground">Zero-layer architecture</p>
                <p className="text-xs text-muted-foreground mt-1">UPLY becomes the master record for your content. Every view, every sale, every fan interaction flows back into your UPLY analytics regardless of where they came from.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
