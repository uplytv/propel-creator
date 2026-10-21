import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ExternalLink, Loader2, Trash2, Share2, Info, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { CREATOR_PLATFORM_OAUTH_COLUMNS } from "@/lib/safeColumns";

const PLATFORMS = [
  {
    id: "youtube",
    name: "YouTube",
    color: "#FF0000",
    logo: "▶",
    desc: "Auto-post recordings and uploaded videos as YouTube videos",
    scopes: ["https://www.googleapis.com/auth/youtube.upload"],
    badge: "Recommended first",
    available: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    color: "#010101",
    logo: "♪",
    desc: "Auto-post clips as TikTok videos",
    available: false,
    comingSoon: true,
  },
  {
    id: "instagram",
    name: "Instagram",
    color: "#E1306C",
    logo: "◻",
    desc: "Auto-post clips as Instagram Reels",
    available: false,
    comingSoon: true,
  },
  {
    id: "twitter",
    name: "X / Twitter",
    color: "#1DA1F2",
    logo: "𝕏",
    desc: "Auto-post clips and stream announcements",
    available: false,
    comingSoon: true,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    color: "#0A66C2",
    logo: "in",
    desc: "Auto-post videos to your LinkedIn profile or page",
    available: false,
    comingSoon: true,
  },
] as const;

interface PlatformConnection {
  id: string;
  platform: string;
  is_active: boolean;
  platform_channel_name?: string;
  platform_username?: string;
}

export default function DistributionSettings() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("creator_platform_oauth" as any).select(CREATOR_PLATFORM_OAUTH_COLUMNS).eq("creator_id", user.id),
      supabase.from("aria_distribution_settings").select("*").eq("creator_id", user.id).maybeSingle(),
    ]).then(([{ data: conns }, { data: setts }]) => {
      setConnections((conns as any) || []);
      setSettings(setts);
      setLoading(false);
    });
  }, [user]);

  const getConnection = (platform: string) =>
    connections.find((c) => c.platform === platform && c.is_active);

  const handleConnect = (platform: (typeof PLATFORMS)[number]) => {
    if (!platform.available) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === "YOUR_GOOGLE_CLIENT_ID") {
      toast.error("Google OAuth not configured yet. Set VITE_GOOGLE_CLIENT_ID first.");
      return;
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${window.location.origin}/settings?tab=distribution&oauth=youtube`,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
      access_type: "offline",
      prompt: "consent",
      state: user!.id,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  const handleDisconnect = async (platform: string) => {
    setDisconnecting(platform);
    await (supabase.from("creator_platform_oauth" as any) as any)
      .update({ is_active: false })
      .eq("creator_id", user!.id)
      .eq("platform", platform);
    setConnections((prev) => prev.filter((c) => c.platform !== platform));
    toast.success("Disconnected");
    setDisconnecting(null);
  };

  const toggleAutoDistribute = async (field: string, value: boolean) => {
    if (!user) return;
    await supabase
      .from("aria_distribution_settings")
      .upsert({ creator_id: user.id, [field]: value } as any, { onConflict: "creator_id" });
    setSettings((prev: any) => ({ ...prev, [field]: value }));
    toast.success(value ? "Auto-distribution enabled" : "Auto-distribution paused");
  };

  // Handle OAuth return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get("oauth");
    const code = params.get("code");
    if (oauth && code && user) {
      supabase.functions
        .invoke("oauth-exchange", {
          body: { platform: oauth, code, creator_id: user.id },
        })
        .then(({ data, error }) => {
          if (error || !data?.success) {
            toast.error("Connection failed — please try again");
          } else {
            toast.success(
              `${oauth.charAt(0).toUpperCase() + oauth.slice(1)} connected!`
            );
            setConnections((prev) => [
              ...prev.filter((c) => c.platform !== oauth),
              data.connection,
            ]);
          }
          const url = new URL(window.location.href);
          url.searchParams.delete("oauth");
          url.searchParams.delete("code");
          url.searchParams.delete("state");
          window.history.replaceState({}, "", url.toString());
        });
    }
  }, [user]);

  const connectedCount = connections.filter((c) => c.is_active).length;

  if (loading)
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-secondary/30 animate-pulse" />
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-foreground">Distribution</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your social accounts. Every video you upload or stream you
          record gets automatically posted.
        </p>
      </div>

      {/* Status card */}
      <div
        className="flex items-center gap-4 p-4 rounded-xl border border-border"
        style={{
          background:
            connectedCount > 0 ? "rgba(61, 124, 255,0.08)" : "hsl(var(--secondary) / 0.3)",
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background:
              connectedCount > 0 ? "rgba(61, 124, 255,0.25)" : "hsl(var(--muted))",
          }}
        >
          <Share2 className="w-5 h-5 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {connectedCount > 0
              ? `${connectedCount} platform${connectedCount !== 1 ? "s" : ""} connected`
              : "No platforms connected yet"}
          </p>
          <p className="text-xs text-muted-foreground">
            {connectedCount > 0
              ? "Your content distributes automatically after upload"
              : "Connect YouTube first — takes 2 minutes"}
          </p>
        </div>
        {connectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Auto-post</span>
            <Switch
              checked={settings?.auto_distribute_recordings ?? false}
              onCheckedChange={(v) =>
                toggleAutoDistribute("auto_distribute_recordings", v)
              }
            />
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="flex gap-3 p-3 rounded-lg bg-secondary/20 border border-border/50">
        <Zap className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-semibold text-foreground">
            Powered by n8n automation
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            When your stream ends or you upload a video, UPLY automatically
            sends it to every connected platform simultaneously. No manual
            posting. Connect once, distribute forever.
          </p>
        </div>
      </div>

      {/* Platform cards */}
      <div className="space-y-3">
        {PLATFORMS.map((plat, i) => {
          const conn = getConnection(plat.id);
          const isConnected = !!conn;

          return (
            <motion.div
              key={plat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card"
            >
              {/* Logo */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: plat.color }}
              >
                {plat.logo}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">
                    {plat.name}
                  </span>
                  {"badge" in plat && (plat as any).badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                      {(plat as any).badge}
                    </span>
                  )}
                  {"comingSoon" in plat && (plat as any).comingSoon && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      Coming Soon
                    </span>
                  )}
                  {isConnected && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {plat.desc}
                </p>
                {isConnected && conn.platform_channel_name && (
                  <p className="text-xs text-primary mt-0.5">
                    @{conn.platform_channel_name}
                  </p>
                )}
              </div>

              {/* Action */}
              <div className="flex-shrink-0">
                {isConnected ? (
                  <button
                    onClick={() => handleDisconnect(plat.id)}
                    disabled={disconnecting === plat.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive border border-border hover:border-destructive/30 transition-all"
                  >
                    {disconnecting === plat.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    Disconnect
                  </button>
                ) : plat.available ? (
                  <Button
                    size="sm"
                    onClick={() => handleConnect(plat)}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <ExternalLink className="w-3 h-3" /> Connect
                  </Button>
                ) : null}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Setup note */}
      <div className="p-3 rounded-lg bg-secondary/20 border border-border/50">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">
              Setup required
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              To activate distribution, set <code className="text-primary">N8N_WEBHOOK_URL</code> in your backend
              function secrets, and <code className="text-primary">VITE_GOOGLE_CLIENT_ID</code> in
              your environment variables. See the n8n setup guide in your
              dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
