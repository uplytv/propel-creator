import { useState } from "react";
import { motion } from "framer-motion";
import { Rss, Copy, Check, ExternalLink, Mic, Apple, Music2, Radio } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";

const PODCAST_PLATFORMS = [
  {
    name: "Apple Podcasts",
    icon: Apple,
    color: "#9333ea",
    submitUrl: "https://podcastsconnect.apple.com",
    instructions: "Go to Podcasts Connect → click + → Add an RSS Feed → paste your feed URL → click Add",
  },
  {
    name: "Spotify",
    icon: Music2,
    color: "#1DB954",
    submitUrl: "https://podcasters.spotify.com",
    instructions: "Go to Spotify for Podcasters → Get Started → Enter your RSS feed URL",
  },
  {
    name: "Google Podcasts",
    icon: Radio,
    color: "#4285F4",
    submitUrl: "https://podcastsmanager.google.com",
    instructions: "Go to Google Podcasts Manager → Add Podcast → enter your RSS URL",
  },
];

export default function PodcastRSS() {
  const { profile } = useApp();
  const [copied, setCopied] = useState(false);

  const username = (profile as any)?.username || (profile as any)?.name;
  const feedUrl = username
    ? `https://uply.tv/functions/v1/podcast-rss?username=${username}`
    : null;

  const handleCopy = async () => {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    toast.success("RSS feed URL copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Rss className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <h1 className="text-xl font-bold text-foreground">
                Podcast RSS Feed
              </h1>
              <p className="text-sm text-muted-foreground">Submit your UPLY content to Apple Podcasts, Spotify & more</p>
            </div>
          </div>
        </motion.div>

        {/* Your RSS Feed URL */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl p-5 bg-card border border-border space-y-3">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Your RSS Feed URL</p>
          </div>

          {feedUrl ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-xs text-muted-foreground font-mono break-all select-all">
                  {feedUrl}
                </div>
                <Button onClick={handleCopy} size="sm" variant="outline" className="shrink-0 gap-1.5">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                <p>This feed includes all your published stream recordings and public videos.</p>
                <p>It auto-updates every time you publish new content.</p>
              </div>
            </>
          ) : (
            <div className="rounded-xl p-4 bg-secondary/30 border border-border text-center">
              <p className="text-sm font-semibold text-foreground">Username required</p>
              <p className="text-xs text-muted-foreground mt-1">
                Set a username in your profile settings to generate your RSS feed URL.
              </p>
            </div>
          )}
        </motion.div>

        {/* What's included */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl p-5 bg-card border border-border space-y-3">
          <p className="text-sm font-semibold text-foreground">What's included in your feed</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: "🎙️", label: "Stream recordings", desc: "All your published live stream recordings" },
              { icon: "🎬", label: "Public videos", desc: "All videos set to public visibility" },
              { icon: "🔄", label: "Auto-updates", desc: "Feed refreshes automatically with new content" },
              { icon: "📊", label: "Full metadata", desc: "Title, description, duration, artwork per episode" },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-3 bg-secondary/30 border border-border">
                <span className="text-lg">{item.icon}</span>
                <p className="text-xs font-semibold text-foreground mt-1">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Platform submission */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl p-5 bg-card border border-border space-y-4">
          <p className="text-sm font-semibold text-foreground">Submit to podcast platforms</p>
          <div className="space-y-3">
            {PODCAST_PLATFORMS.map((platform, i) => (
              <div key={i} className="rounded-xl p-4 bg-secondary/30 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${platform.color}20` }}>
                      <platform.icon className="w-4.5 h-4.5" style={{ color: platform.color }} />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{platform.name}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" asChild>
                    <a href={platform.submitUrl} target="_blank" rel="noreferrer">
                      Submit <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">{platform.instructions}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pro tip */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-2xl p-4 bg-primary/5 border border-primary/20">
          <div className="flex gap-3">
            <span className="text-lg">💡</span>
            <div>
              <p className="text-xs font-semibold text-foreground">Pro tip</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Apple Podcasts requires your show image to be a square JPEG or PNG between 1400×1400 and 3000×3000 pixels.
                Update your profile avatar to a high-res square image before submitting.
                Approval typically takes 24–48 hours.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
