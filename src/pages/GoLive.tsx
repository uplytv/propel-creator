import { useState } from "react";
import { motion } from "framer-motion";
import { Radio, Globe, Lock, Video, Mic, Settings, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { categories } from "@/data/mockStreams";

export default function GoLive() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"public" | "private">("public");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleGoLive = () => {
    setIsStreaming(true);
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

          {!isStreaming ? (
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

              {/* Preview */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Camera Preview</label>
                <div className="aspect-video rounded-xl bg-muted/50 border border-border flex items-center justify-center">
                  <div className="text-center">
                    <Video className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Camera preview will appear here</p>
                    <div className="flex items-center justify-center gap-4 mt-4">
                      <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm text-foreground hover:bg-secondary/80 transition-colors">
                        <Video className="w-4 h-4" /> Camera
                      </button>
                      <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm text-foreground hover:bg-secondary/80 transition-colors">
                        <Mic className="w-4 h-4" /> Microphone
                      </button>
                      <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm text-foreground hover:bg-secondary/80 transition-colors">
                        <Monitor className="w-4 h-4" /> Screen
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Go Live Button */}
              <Button
                variant="hero"
                size="xl"
                onClick={handleGoLive}
                disabled={!title.trim()}
                className="w-full"
              >
                <Radio className="w-5 h-5 mr-2" />
                {mode === "public" ? "Go Live — Public" : "Go Live — Members Only"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Your stream will be automatically recorded and saved to your content library.
              </p>
            </div>
          ) : (
            /* Live State */
            <div className="text-center py-12">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6"
              >
                <div className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center">
                  <Radio className="w-6 h-6 text-destructive-foreground" />
                </div>
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-2">You're Live!</h2>
              <p className="text-muted-foreground mb-1">{title}</p>
              <p className="text-sm text-muted-foreground mb-8">
                {mode === "public" ? "🌍 Public stream — visible on discovery feed" : "🔒 Members-only stream"}
              </p>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => setIsStreaming(false)}
              >
                End Stream
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
