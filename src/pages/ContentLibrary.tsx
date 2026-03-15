import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Film, Play, Clock, Upload, Trash2, Loader2, RotateCcw, AlertTriangle } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface MuxAsset {
  id: string;
  mux_asset_id: string;
  mux_playback_id: string | null;
  title: string | null;
  description: string | null;
  status: string | null;
  duration: number | null;
  aspect_ratio: string | null;
  thumbnail_url: string | null;
  is_public: boolean | null;
  created_at: string | null;
  upload_id: string | null;
}

export default function ContentLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<MuxAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [reuploadingId, setReuploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reuploadAssetRef = useRef<MuxAsset | null>(null);

  const fetchAssets = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("mux_assets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAssets(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();

    const channel = supabase
      .channel("my-assets")
      .on("postgres_changes", { event: "*", schema: "public", table: "mux_assets" }, () => {
        fetchAssets();
      })
      .subscribe();

    // Auto-poll every 30s while any asset is still preparing
    const interval = setInterval(() => {
      setAssets((current) => {
        const hasPreparing = current.some((a) => a.status !== "ready" && a.status !== "errored");
        if (hasPreparing) fetchAssets();
        return current;
      });
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  const toggleVisibility = async (asset: MuxAsset) => {
    await supabase
      .from("mux_assets")
      .update({ is_public: !asset.is_public })
      .eq("id", asset.id);
    fetchAssets();
    toast({
      title: asset.is_public ? "Video set to private" : "Video set to public",
      description: asset.is_public
        ? "This video is no longer visible in discovery."
        : "This video is now visible in the discovery feed.",
    });
  };

  const deleteAsset = async (asset: MuxAsset) => {
    await supabase.from("mux_assets").delete().eq("id", asset.id);
    fetchAssets();
    toast({ title: "Video deleted", description: "The video has been removed from your library." });
  };

  const getThumbnail = (asset: MuxAsset) => {
    if (asset.mux_playback_id) {
      return `https://image.mux.com/${asset.mux_playback_id}/thumbnail.png?width=640&height=360&time=2`;
    }
    return null;
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <Film className="w-7 h-7 text-primary" /> Content Library
              </h1>
              <p className="text-muted-foreground mt-1">Your recordings and uploaded videos</p>
            </div>
            <Button onClick={() => navigate("/go-live")} className="gap-2">
              <Upload className="w-4 h-4" /> Record New
            </Button>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : assets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 glass-card rounded-2xl"
          >
            <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
            <p className="text-muted-foreground mb-6">
              Record your first video using the Broadcast Studio or upload content.
            </p>
            <Button onClick={() => navigate("/go-live")} className="gap-2">
              <Play className="w-4 h-4" /> Go to Studio
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {assets.map((asset, i) => {
              const thumb = getThumbnail(asset);
              return (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-xl overflow-hidden group"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-secondary/50">
                    {thumb ? (
                      <img src={thumb} alt={asset.title || "Video"} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-10 h-10 text-muted-foreground/40" />
                      </div>
                    )}

                    {/* Status badge */}
                    <div className="absolute top-2 left-2">
                      {asset.status === "ready" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/90 text-primary-foreground">
                          Ready
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-warning/90 text-warning-foreground flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Processing
                        </span>
                      )}
                    </div>

                    {/* Duration */}
                    {asset.duration && (
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono">
                        {formatDuration(asset.duration)}
                      </div>
                    )}

                    {/* Play overlay */}
                    {asset.status === "ready" && asset.mux_playback_id && (
                      <div
                        onClick={() => navigate(`/stream/${asset.id}?type=vod`)}
                        className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center cursor-pointer"
                      >
                        <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <h3
                      className="font-semibold text-sm truncate cursor-pointer hover:text-primary transition-colors"
                      onClick={() => navigate(`/stream/${asset.id}?type=vod`)}
                    >
                      {asset.title || "Untitled Recording"}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(asset.created_at)}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${asset.is_public ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                        {asset.is_public ? "Public" : "Private"}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => toggleVisibility(asset)}
                      >
                        {asset.is_public ? "Make Private" : "Make Public"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteAsset(asset)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
