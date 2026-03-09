import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Radio, Globe, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { categories } from "@/data/mockStreams";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BroadcastStudio from "@/components/live/BroadcastStudio";

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
      toast({ title: "Stream created!", description: "Your broadcast studio is ready." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to create stream", variant: "destructive" });
    } finally {
      setIsSettingUp(false);
    }
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
              <p className="text-sm text-muted-foreground">
                {streamData ? "Broadcast Studio" : "Start streaming to your audience"}
              </p>
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
            <BroadcastStudio
              streamData={streamData}
              streamStatus={streamStatus}
              title={title}
              onEndStream={() => setStreamData(null)}
            />
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
