import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Sparkles, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useAriaDistributionSettings, useAriaJobs } from "@/hooks/useAriaContentEngine";

const PLATFORMS = [
  { key: "auto_post_community", label: "Auto-post to my UPLY community", icon: "⚡" },
  { key: "auto_send_email_blast", label: "Auto-send email blast to members", icon: "📧" },
  { key: "auto_post_tiktok", label: "TikTok", icon: "🎵" },
  { key: "auto_post_instagram", label: "Instagram", icon: "📸" },
  { key: "auto_post_youtube_shorts", label: "YouTube Shorts", icon: "▶️" },
  { key: "auto_post_twitter", label: "Twitter/X", icon: "🐦" },
  { key: "auto_post_linkedin", label: "LinkedIn", icon: "💼" },
];

const SCHEDULE_OPTIONS = [
  { value: "immediate", label: "Post immediately" },
  { value: "spread_24h", label: "Spread over 24 hours" },
  { value: "spread_week", label: "Spread over 1 week" },
];

const TONE_OPTIONS = ["educational", "entertaining", "motivational", "documentary", "mix"];

export default function AriaSettingsSection() {
  const { settings, isLoading, updateSettings } = useAriaDistributionSettings();
  const { data: jobs } = useAriaJobs();

  const [saving, setSaving] = useState<string | null>(null);

  const handleToggle = async (key: string, value: boolean) => {
    setSaving(key);
    await updateSettings({ [key]: value });
    setSaving(null);
  };

  const handleUpdate = async (key: string, value: any) => {
    setSaving(key);
    await updateSettings({ [key]: value });
    setSaving(null);
  };

  // Calculate usage stats
  const totalJobs = (jobs || []).length;
  const completedJobs = (jobs || []).filter((j: any) => j.status === "completed").length;
  const totalClips = (jobs || []).reduce((sum: number, j: any) => sum + (j.outputs?.clips || 0), 0);
  const totalContent = (jobs || []).reduce((sum: number, j: any) => sum + (j.outputs?.total_generated || 0), 0);
  const estimatedHoursSaved = Math.round(totalClips * 1 + (totalContent - totalClips) * 0.5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Auto-processing */}
      <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">ARIA Content Engine</h2>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-foreground">Auto-process new content</p>
            <p className="text-xs text-muted-foreground">Automatically run ARIA on all new streams & videos</p>
          </div>
          <Switch
            checked={settings?.auto_process_new_content ?? true}
            onCheckedChange={(v) => handleToggle("auto_process_new_content", v)}
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-foreground">Require approval before posting</p>
            <p className="text-xs text-muted-foreground">Review all content before it goes live</p>
          </div>
          <Switch
            checked={settings?.require_approval ?? true}
            onCheckedChange={(v) => handleToggle("require_approval", v)}
          />
        </div>
      </div>

      {/* Distribution */}
      <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Distribution</h3>
        {PLATFORMS.map((p) => (
          <div key={p.key} className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">{p.icon}</span>
              <span className="text-sm text-foreground">{p.label}</span>
            </div>
            <Switch
              checked={(settings as any)?.[p.key] ?? false}
              onCheckedChange={(v) => handleToggle(p.key, v)}
            />
          </div>
        ))}

        <div className="pt-2">
          <p className="text-sm font-medium text-foreground mb-2">Posting schedule</p>
          <div className="flex flex-wrap gap-2">
            {SCHEDULE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleUpdate("posting_schedule", opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  (settings?.posting_schedule || "immediate") === opt.value
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content preferences */}
      <div className="rounded-2xl border border-border bg-card/40 p-6 space-y-5">
        <h3 className="font-semibold text-foreground">Content Preferences</h3>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-foreground">Clips per stream</p>
            <span className="text-sm font-medium text-primary">{settings?.max_clips_per_job || 10}</span>
          </div>
          <Slider
            value={[settings?.max_clips_per_job || 10]}
            onValueChange={([v]) => handleUpdate("max_clips_per_job", v)}
            min={5}
            max={20}
            step={1}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-foreground">Min clip length</p>
            <span className="text-sm font-medium text-primary">{settings?.min_clip_seconds || 20}s</span>
          </div>
          <Slider
            value={[settings?.min_clip_seconds || 20]}
            onValueChange={([v]) => handleUpdate("min_clip_seconds", v)}
            min={15}
            max={60}
            step={5}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-foreground">Max clip length</p>
            <span className="text-sm font-medium text-primary">{settings?.max_clip_seconds || 60}s</span>
          </div>
          <Slider
            value={[settings?.max_clip_seconds || 60]}
            onValueChange={([v]) => handleUpdate("max_clip_seconds", v)}
            min={30}
            max={120}
            step={5}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-foreground mb-2">Content tone</p>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => handleUpdate("content_tone", t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  (settings?.content_tone || "mix") === t
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Usage stats */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">ARIA Usage</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-2xl font-bold text-foreground">{totalContent}</p>
            <p className="text-xs text-muted-foreground">Content generated</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalClips}</p>
            <p className="text-xs text-muted-foreground">Clips created</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{completedJobs}</p>
            <p className="text-xs text-muted-foreground">Jobs completed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{estimatedHoursSaved}h</p>
            <p className="text-xs text-muted-foreground">Hours saved</p>
          </div>
        </div>
        {estimatedHoursSaved > 0 && (
          <p className="text-xs text-primary mt-3 font-medium">
            ✨ ARIA has saved you {estimatedHoursSaved} hours of content work
          </p>
        )}
      </div>
    </motion.div>
  );
}
