import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle, XCircle, AlertTriangle, ExternalLink, Trash2, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useSimulcastDestinations } from "@/hooks/useSimulcast";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const PLATFORMS = [
  {
    id: "youtube",
    name: "YouTube",
    color: "#FF0000",
    logo: "▶",
    defaultRtmp: "rtmp://a.rtmp.youtube.com/live2",
    helpUrl: "https://studio.youtube.com",
    helpText: "Go Live → Stream settings",
  },
  {
    id: "twitch",
    name: "Twitch",
    color: "#9146FF",
    logo: "⬡",
    defaultRtmp: "rtmp://live.twitch.tv/app",
    helpUrl: "https://dashboard.twitch.tv/settings/stream",
    helpText: "Settings → Stream",
  },
  {
    id: "kick",
    name: "Kick",
    color: "#53FC18",
    logo: "K",
    defaultRtmp: "rtmp://fa723fc1b171.global-contribute.live-video.net/app",
    helpUrl: "https://kick.com/dashboard/stream-key",
    helpText: "Dashboard → Stream Key",
  },
];

function getKeyAge(keyCreatedAt: string): { label: string; color: string; level: "fresh" | "aging" | "old" } {
  const days = Math.floor((Date.now() - new Date(keyCreatedAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 30) return { label: `🟢 Key added ${days} days ago`, color: "text-green-400", level: "fresh" };
  if (days < 90) return { label: `🟡 Key is ${days} days old — consider rotating soon`, color: "text-yellow-400", level: "aging" };
  return { label: `🔴 Key is ${days} days old — rotation recommended`, color: "text-red-400", level: "old" };
}

export default function SimulcastSettings() {
  const { destinations, loading, saveDestination, toggleDestination, deleteDestination, testConnection } = useSimulcastDestinations();
  const { toast } = useToast();

  const [editState, setEditState] = useState<Record<string, {
    rtmpUrl: string;
    streamKey: string;
    label: string;
    showKey: boolean;
    saving: boolean;
    testing: boolean;
    testResult: { success: boolean; error?: string } | null;
    testCooldown: boolean;
  }>>({});

  const getEdit = (platform: string) => {
    const dest = destinations.find((d) => d.platform === platform);
    const plat = PLATFORMS.find((p) => p.id === platform)!;
    return editState[platform] || {
      rtmpUrl: dest?.rtmp_url || plat.defaultRtmp,
      streamKey: "",
      label: dest?.platform_label || "",
      showKey: false,
      saving: false,
      testing: false,
      testResult: null,
      testCooldown: false,
    };
  };

  const updateEdit = (platform: string, updates: Partial<ReturnType<typeof getEdit>>) => {
    setEditState((prev) => ({ ...prev, [platform]: { ...getEdit(platform), ...updates } }));
  };

  const handleSave = async (platformId: string) => {
    const edit = getEdit(platformId);
    const dest = destinations.find((d) => d.platform === platformId);
    if (!edit.streamKey && !dest?.stream_key_last_four) {
      toast({ title: "Stream key is required", variant: "destructive" });
      return;
    }
    updateEdit(platformId, { saving: true });
    try {
      const keyToSave = edit.streamKey || dest?.stream_key_last_four || "";
      if (!edit.streamKey && dest) {
        // Just update label/rtmp, not key
        await saveDestination(platformId, edit.rtmpUrl, dest.stream_key_last_four ? "EXISTING" : "", edit.label);
      } else {
        await saveDestination(platformId, edit.rtmpUrl, edit.streamKey, edit.label);
      }
      updateEdit(platformId, { saving: false, streamKey: "" });
      toast({ title: `${platformId} saved ✓` });
    } catch {
      updateEdit(platformId, { saving: false });
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const handleTest = async (platformId: string) => {
    updateEdit(platformId, { testing: true, testResult: null });
    try {
      const result = await testConnection(platformId);
      updateEdit(platformId, { testing: false, testResult: result, testCooldown: true });
      // Re-enable after 60s
      setTimeout(() => updateEdit(platformId, { testCooldown: false }), 60000);
    } catch {
      updateEdit(platformId, { testing: false, testResult: { success: false, error: "Test failed" }, testCooldown: true });
      setTimeout(() => updateEdit(platformId, { testCooldown: false }), 60000);
    }
  };

  const handleDelete = async (platformId: string) => {
    await deleteDestination(platformId);
    setEditState((prev) => { const n = { ...prev }; delete n[platformId]; return n; });
    toast({ title: "Destination removed" });
  };

  if (loading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="rounded-2xl border border-border bg-card/40 p-4">
        <h2 className="text-lg font-semibold text-foreground mb-1">Multistream Simulcast</h2>
        <p className="text-xs text-muted-foreground">Go live on UPLY and simultaneously broadcast to YouTube, Twitch, and Kick.</p>
      </div>

      {PLATFORMS.map((plat) => {
        const dest = destinations.find((d) => d.platform === plat.id);
        const edit = getEdit(plat.id);
        const isEnabled = dest?.is_enabled ?? false;
        const keyAge = dest?.key_created_at ? getKeyAge(dest.key_created_at) : null;

        return (
          <div
            key={plat.id}
            className="rounded-2xl border border-border bg-card/40 p-5 space-y-4 transition-opacity"
            style={{ opacity: isEnabled || !dest ? 1 : 0.5 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: `${plat.color}20`, color: plat.color }}
                >
                  {plat.logo}
                </div>
                <span className="text-foreground font-semibold">{plat.name}</span>
                {dest?.is_verified && <CheckCircle className="w-4 h-4 text-green-400" />}
              </div>
              {dest && (
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => toggleDestination(plat.id, checked)}
                />
              )}
            </div>

            {/* Label */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Platform Label</label>
              <input
                value={edit.label}
                onChange={(e) => updateEdit(plat.id, { label: e.target.value })}
                placeholder={`My Main ${plat.name} Channel`}
                className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* RTMP URL */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">RTMP URL</label>
              <input
                value={edit.rtmpUrl}
                onChange={(e) => updateEdit(plat.id, { rtmpUrl: e.target.value })}
                className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2 text-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Stream Key */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Stream Key</label>
              <div className="relative">
                <input
                  type={edit.showKey ? "text" : "password"}
                  value={edit.streamKey}
                  onChange={(e) => updateEdit(plat.id, { streamKey: e.target.value })}
                  placeholder={dest?.stream_key_last_four ? `••••••••••••${dest.stream_key_last_four}` : "Paste your stream key"}
                  className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2 text-sm pr-10 font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={() => updateEdit(plat.id, { showKey: !edit.showKey })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {edit.showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                🔒 Keep your stream key private — never show it on stream.
              </p>
              <a href={plat.helpUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                <ExternalLink className="w-3 h-3" /> {plat.helpText}
              </a>
            </div>

            {/* Key Age */}
            {keyAge && (
              <p className={`text-xs ${keyAge.color}`}>{keyAge.label}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSave(plat.id)}
                disabled={edit.saving}
                className="border-primary/30 text-primary"
              >
                {edit.saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTest(plat.id)}
                disabled={edit.testing || edit.testCooldown || !dest}
              >
                {edit.testing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                {edit.testing ? "Testing..." : "Test Connection"}
              </Button>
              {dest && (
                <Button variant="ghost" size="sm" onClick={() => handleDelete(plat.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Test Result */}
            {edit.testResult && (
              <div className={`text-xs flex items-center gap-1 ${edit.testResult.success ? "text-green-400" : "text-destructive"}`}>
                {edit.testResult.success ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {edit.testResult.success ? "✓ Connection successful" : `✗ Connection failed: ${edit.testResult.error}`}
              </div>
            )}
          </div>
        );
      })}

      {/* How it works */}
      <div className="rounded-2xl border border-border bg-card/40 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">How Simulcasting Works</h3>
        </div>
        <div className="space-y-2">
          {[
            { step: "1", text: "Add your stream keys for YouTube, Twitch, and Kick above." },
            { step: "2", text: "Enable platforms when setting up your stream on the Go Live page." },
            { step: "3", text: "UPLY broadcasts to all enabled platforms simultaneously." },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">{s.step}</span>
              </div>
              <p className="text-xs text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
