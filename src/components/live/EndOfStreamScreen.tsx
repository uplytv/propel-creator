import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Eye, Zap, Coins, Users, Share2, GraduationCap, PartyPopper, Download } from "lucide-react";
import HighlightsReel from "./HighlightsReel";
import type { HighlightMoment } from "@/hooks/useStreamHighlights";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import SharePanel from "@/components/share/SharePanel";
import StreamToCourseDialog from "./StreamToCourseDialog";
import AIStreamSummary from "./AIStreamSummary";
import AutoClipSuggestions from "./AutoClipSuggestions";
import SimulcastSummary from "./SimulcastSummary";
import { useStreamDownload } from "@/hooks/useStreamDownload";
import { useAutoClipAI } from "@/hooks/useAutoClipAI";
import { useStreamAchievements } from "@/hooks/useStreamAchievements";
import StreamAchievements from "./StreamAchievements";
import { toast } from "sonner";
import { getSiteUrl } from "@/lib/siteUrl";
import { buildStreamShareUrl } from "@/lib/shareUrls";

interface EndOfStreamScreenProps {
  streamId: string;
  creatorId: string;
  streamTitle: string;
  playbackId?: string | null;
  muxAssetId?: string | null;
  durationSeconds: number;
  onClose: () => void;
  username?: string | null;
  streamSlug?: string | null;
  highlights?: HighlightMoment[];
  chaptersDescription?: string;
}

interface StreamStats {
  peakViewers: number;
  totalReactions: number;
  totalTips: number;
  newSubscribers: number;
}

export default function EndOfStreamScreen({
  streamId,
  creatorId,
  streamTitle,
  playbackId,
  muxAssetId,
  durationSeconds,
  onClose,
  username,
  streamSlug,
  highlights = [],
  chaptersDescription,
}: EndOfStreamScreenProps) {
  const [stats, setStats] = useState<StreamStats>({
    peakViewers: 0,
    totalReactions: 0,
    totalTips: 0,
    newSubscribers: 0,
  });
  const [shareOpen, setShareOpen] = useState(false);
  const [courseOpen, setCourseOpen] = useState(false);
  const [recordingTarget, setRecordingTarget] = useState<{ id: string; slug: string | null } | null>(null);
  const [shareUrl, setShareUrl] = useState<string>(buildStreamShareUrl(streamId, "web_share"));
  const { downloadRecording, downloading, progress: downloadProgress } = useStreamDownload();
  const autoClips = useAutoClipAI(streamId, creatorId);
  const streamAchievements = useStreamAchievements();

  useEffect(() => {
    const fetchStats = async () => {
      // Peak viewers from session
      const { data: session } = await supabase
        .from("live_stream_sessions")
        .select("peak_viewers")
        .eq("stream_id", streamId)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      // Total reactions
      const { count: reactionCount } = await supabase
        .from("live_reactions")
        .select("*", { count: "exact", head: true })
        .eq("stream_id", streamId);

      // Total tips
      const { data: tips } = await supabase
        .from("tip_transactions")
        .select("amount")
        .eq("stream_id", streamId);
      const totalTips = tips?.reduce((sum, t) => sum + t.amount, 0) || 0;

      // New members (approximate: joined during stream window)
      const { count: newMembers } = await supabase
        .from("community_members")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", creatorId)
        .gte("joined_at", new Date(Date.now() - durationSeconds * 1000).toISOString());

      setStats({
        peakViewers: session?.peak_viewers || 0,
        totalReactions: reactionCount || 0,
        totalTips,
        newSubscribers: newMembers || 0,
      });
    };

    fetchStats();
  }, [streamId, creatorId, durationSeconds]);

  useEffect(() => {
    let cancelled = false;

    const resolveShareTarget = async () => {
      const liveFallbackUrl = `${getSiteUrl()}/stream/${streamId}`;

      const { data: session } = await supabase
        .from("live_stream_sessions")
        .select("mux_asset_id")
        .eq("stream_id", streamId)
        .not("mux_asset_id", "is", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!session?.mux_asset_id || !username) {
        if (!cancelled) {
          setRecordingTarget(null);
          setShareUrl(liveFallbackUrl);
        }
        return;
      }

      const { data: recording } = await supabase
        .from("stream_recordings")
        .select("id, slug")
        .eq("mux_asset_id", session.mux_asset_id)
        .maybeSingle();

      if (cancelled) return;

      if (recording) {
        setRecordingTarget(recording);
        setShareUrl(`${getSiteUrl()}/stream/${recording.id}?type=recording`);
        return;
      }

      setRecordingTarget(null);
      setShareUrl(liveFallbackUrl);
    };

    resolveShareTarget();

    return () => {
      cancelled = true;
    };
  }, [streamId, streamSlug, username]);

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}h ${m}m ${sec}s`
      : `${m}m ${sec}s`;
  };

  const handleShareStream = async () => {
    const shareText = recordingTarget
      ? `Watch my recording "${streamTitle}" on UPLY!`
      : `Check out my stream "${streamTitle}" on UPLY!`;
    const shareData = {
      title: streamTitle,
      text: shareText,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled, fall through
      }
    }

    // Fallback: copy to clipboard
    const copyText = `${shareText}\n${shareUrl}`;
    try {
      await navigator.clipboard.writeText(copyText);
      toast.success("Copied to clipboard!");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = copyText;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast.success("Copied to clipboard!");
    }
  };

  const handleDownload = async () => {
    if (muxAssetId) {
      downloadRecording(muxAssetId, streamTitle);
    } else {
      // Try to find asset from mux_assets table
      const query = supabase.from("mux_assets").select("mux_asset_id, status");
      const { data: assets } = await (query as any).eq("stream_id", streamId).limit(1);
      const asset = (assets as any)?.[0] ?? null;

      if (asset?.mux_asset_id) {
        if (asset.status === 'preparing') {
          toast.success("Recording is still processing", { description: "Try again in a few minutes" });
        } else {
          downloadRecording(asset.mux_asset_id, streamTitle);
        }
      } else {
        toast.success("No recording found for this stream");
      }
    }
  };

  const statCards = [
    { label: "Duration", value: formatDuration(durationSeconds), icon: Clock, color: "text-primary" },
    { label: "Peak Viewers", value: stats.peakViewers.toString(), icon: Eye, color: "text-blue-400" },
    { label: "Reactions", value: stats.totalReactions.toString(), icon: Zap, color: "text-yellow-400" },
    { label: "Tips Received", value: `${stats.totalTips}`, icon: Coins, color: "text-amber-400" },
    { label: "New Members", value: `+${stats.newSubscribers}`, icon: Users, color: "text-primary" },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Celebration Header */}
        <div className="text-center py-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
          >
            <PartyPopper className="w-8 h-8 text-primary" />
          </motion.div>
          <h2 className="text-xl font-bold text-foreground mb-1">Stream Complete! 🎉</h2>
          <p className="text-sm text-muted-foreground">{streamTitle}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="glass-card p-4 text-center"
            >
              <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Highlights Reel */}
        {highlights.length > 0 && (
          <HighlightsReel highlights={highlights} durationSeconds={durationSeconds} />
        )}

        {/* VOD Chapters */}
        {chaptersDescription && (
          <div className="glass-card p-4">
            <p className="text-xs font-bold text-foreground mb-2">📑 VOD Chapters</p>
            <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap">{chaptersDescription}</pre>
          </div>
        )}

        {/* Simulcast Summary */}
        <SimulcastSummary streamId={streamId} />

        {/* AI-Powered Stream Summary */}
        <AIStreamSummary
          streamId={streamId}
          streamTitle={streamTitle}
          durationSeconds={durationSeconds}
          highlights={highlights}
          chaptersDescription={chaptersDescription}
          creatorId={creatorId}
        />

        {/* AI Auto-Clip Suggestions */}
        <AutoClipSuggestions
          suggestions={autoClips.suggestions}
          analyzing={autoClips.analyzing}
          onAnalyze={() => autoClips.analyzeStream(highlights, chaptersDescription, durationSeconds)}
          onCreateClip={(s) => muxAssetId ? autoClips.createClip(s, muxAssetId) : undefined}
          onSkip={autoClips.skipClip}
          hasHighlights={highlights.length > 0}
        />

        {/* Stream Achievements */}
        <StreamAchievements
          achievements={streamAchievements.achievements}
          unlockedCount={streamAchievements.unlockedCount}
          totalCount={streamAchievements.totalCount}
          progressPercent={streamAchievements.progressPercent}
          loading={streamAchievements.loading}
          creatorUsername={username}
        />

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={handleShareStream}
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share Your Stream
          </Button>

          <div>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleDownload}
              disabled={downloading}
            >
              <Download className="w-5 h-5 mr-2" />
              {downloading ? 'Downloading...' : 'Download Recording (MP4)'}
            </Button>
            {downloading && <Progress value={downloadProgress} className="mt-2 h-1.5" />}
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => setCourseOpen(true)}
          >
            <GraduationCap className="w-5 h-5 mr-2" />
            Convert to Course Lesson
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={onClose}
          >
            Back to Dashboard
          </Button>
        </div>
      </motion.div>

      <SharePanel
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        contentType={recordingTarget ? "recording" : "stream"}
        contentId={recordingTarget?.id || streamId}
        title={streamTitle}
        playbackId={playbackId}
        muxAssetId={muxAssetId}
        creatorUsername={username}
        contentSlug={recordingTarget?.slug || streamSlug}
        url={shareUrl}
      />

      <StreamToCourseDialog
        open={courseOpen}
        onClose={() => setCourseOpen(false)}
        creatorId={creatorId}
        streamTitle={streamTitle}
        muxAssetId={muxAssetId || undefined}
        durationSeconds={durationSeconds}
      />
    </>
  );
}
