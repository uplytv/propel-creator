import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Radio, Globe, Lock, Copy, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { categories } from "@/data/mockStreams";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function GoLive() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"public" | "private">("public");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [streamData, setStreamData] = useState<{
    streamId: string;
    streamKey: string;
    playbackId: string;
    rtmpUrl: string;
  } | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<string>("idle");

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
      setStreamData(data);
      setStreamStatus("idle");
      toast({ title: "Stream created!", description: "Enter credentials into your streaming software." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to create stream", variant: "destructive" });
    } finally {
      setIsSettingUp(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

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
              <p className="text-sm text-muted-foreground">Start streaming to your audience</p>
            </div>
          </div>

          {!streamData ? (
            <div className="space-y-6">
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
            </div>
          ) : (
            /* Stream Credentials & Status */
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                {streamStatus === "active" ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                    </span>
                    <span className="text-sm font-bold text-primary">LIVE</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border">
                    <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Waiting for stream...</span>
                  </div>
                )}
                <span className="text-sm text-muted-foreground">{title}</span>
              </div>

              {/* Credentials Card */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-lg font-bold text-foreground">Stream Credentials</h3>
                <p className="text-sm text-muted-foreground">
                  Enter these credentials into OBS, Streamyard, or any streaming software to go live on UPLY.
                </p>

                {/* RTMP URL */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">RTMP URL</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-sm font-mono text-foreground">
                      {streamData.rtmpUrl}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(streamData.rtmpUrl, "rtmp")}
                      className="flex-shrink-0"
                    >
                      {copiedField === "rtmp" ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Stream Key */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Stream Key</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-sm font-mono text-foreground relative overflow-hidden">
                      {showKey ? streamData.streamKey : "••••••••••••••••••••••••"}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowKey(!showKey)}
                      className="flex-shrink-0"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(streamData.streamKey, "key")}
                      className="flex-shrink-0"
                    >
                      {copiedField === "key" ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="glass-card p-5">
                <h4 className="text-sm font-semibold text-foreground mb-3">Quick Setup</h4>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">1.</span>
                    Open your streaming software (OBS, Streamyard, etc.)
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">2.</span>
                    Set the server/RTMP URL to the value above
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">3.</span>
                    Paste your stream key
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">4.</span>
                    Click "Start Streaming" — your status will update to LIVE automatically
                  </li>
                </ol>
              </div>

              <Button
                variant="destructive"
                size="lg"
                onClick={() => setStreamData(null)}
                className="w-full"
              >
                Create New Stream
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
