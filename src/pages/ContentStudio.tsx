import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Film, MessageSquare, FileText, Mail, BookOpen, ShoppingBag,
  Calendar, Check, X, Pencil, Rocket, Clock, Loader2, Play, ChevronDown,
  CheckSquare, Filter, MoreHorizontal, Copy, Download
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useAriaJobs, useAriaGeneratedContent, useUpdateContentStatus, useBulkUpdateContentStatus, useStartAriaJob } from "@/hooks/useAriaContentEngine";
import UPLYMuxPlayer from "@/components/MuxPlayer";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const CONTENT_TABS = [
  { id: "all", label: "All Content", icon: Sparkles },
  { id: "short_clip", label: "Clips", icon: Film },
  { id: "captions", label: "Captions", icon: MessageSquare },
  { id: "posts", label: "Posts", icon: FileText },
  { id: "email_blast", label: "Emails", icon: Mail },
  { id: "course_outline", label: "Courses", icon: BookOpen },
  { id: "sales_page", label: "Sales Pages", icon: ShoppingBag },
] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-primary/20 text-primary",
  scheduled: "bg-blue-500/20 text-blue-400",
  published: "border border-primary text-primary",
  rejected: "bg-destructive/20 text-destructive",
};

const STAGE_LABELS: Record<string, string> = {
  queued: "Queued...",
  transcribing: "Transcribing audio...",
  analyzing: "Analyzing content with ARIA...",
  generating: "Generating clips & captions...",
  distributing: "Distributing content...",
  completed: "Complete ✓",
  failed: "Failed",
};

function JobProgressCard({ job }: { job: any }) {
  const progress = job.progress || 0;
  const isActive = !["completed", "failed"].includes(job.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 ${isActive ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isActive && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          {job.status === "completed" && <Check className="w-4 h-4 text-primary" />}
          {job.status === "failed" && <X className="w-4 h-4 text-destructive" />}
          <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">
            {job.source_title || "Processing..."}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
        </span>
      </div>
      <Progress value={progress} className="h-1.5 mb-1" />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{STAGE_LABELS[job.status] || job.status}</span>
        <span className="text-xs font-medium text-primary">{progress}%</span>
      </div>
      {job.status === "completed" && job.outputs?.total_generated && (
        <p className="text-xs text-muted-foreground mt-1">
          Generated {job.outputs.total_generated} pieces of content · {job.outputs.clips || 0} clips
        </p>
      )}
      {job.status === "failed" && job.error_message && (
        <p className="text-xs text-destructive mt-1">{job.error_message}</p>
      )}
    </motion.div>
  );
}

function ContentCard({
  item,
  selected,
  onToggleSelect,
  onUpdateStatus,
  onPlayClip,
}: {
  item: any;
  selected: boolean;
  onToggleSelect: () => void;
  onUpdateStatus: (status: string) => void;
  onPlayClip?: (playbackId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isClip = item.content_type === "short_clip";
  const duration = item.metadata?.duration
    ? `${Math.round(item.metadata.duration)}s`
    : null;

  const platformIcon = (p: string) => {
    const icons: Record<string, string> = {
      tiktok: "🎵", instagram: "📸", youtube: "▶️", twitter: "🐦",
      linkedin: "💼", uply: "⚡",
    };
    return icons[p] || "🌐";
  };

  const copyContent = () => {
    const text = item.body || item.title || "";
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard ✓");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl border bg-card overflow-hidden transition-colors ${
        selected ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-border/80"
      }`}
    >
      {/* Clip preview */}
      {isClip && item.mux_clip_playback_id && (
        <div className="relative aspect-video bg-secondary">
          <img
            src={`https://image.mux.com/${item.mux_clip_playback_id}/thumbnail.jpg?time=2`}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {duration && (
            <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
              {duration}
            </span>
          )}
          <button
            onClick={() => item.mux_clip_playback_id && onPlayClip?.(item.mux_clip_playback_id)}
            aria-label="Play clip"
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
          >
            <Play className="w-8 h-8 text-white" />
          </button>
        </div>
      )}

      <div className="p-3">
        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          <button onClick={onToggleSelect} aria-label="Select content" className="mt-0.5 flex-shrink-0">
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
              selected ? "bg-primary border-primary" : "border-muted-foreground/40"
            }`}>
              {selected && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate">{item.title || "Untitled"}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[item.status] || STATUS_COLORS.draft}`}>
                {item.status}
              </Badge>
              {item.platform && (
                <span className="text-[10px] text-muted-foreground">
                  {platformIcon(item.platform)} {item.platform}
                </span>
              )}
              {item.metadata?.viral_score && (
                <span className="text-[10px] text-primary font-medium">🔥 {item.metadata.viral_score}</span>
              )}
            </div>
          </div>
        </div>

        {/* Body preview */}
        {item.body && !isClip && (
          <div className="mb-2">
            <p className={`text-xs text-muted-foreground ${expanded ? "" : "line-clamp-3"}`}>
              {item.body}
            </p>
            {item.body.length > 150 && (
              <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-primary mt-0.5">
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 flex-wrap">
          {item.status === "draft" && (
            <>
              <button
                onClick={() => onUpdateStatus("approved")}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Check className="w-3 h-3" /> Approve
              </button>
              <button
                onClick={() => onUpdateStatus("rejected")}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
              >
                <X className="w-3 h-3" /> Reject
              </button>
            </>
          )}
          <button
            onClick={copyContent}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <Copy className="w-3 h-3" /> Copy
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function ContentStudio() {
  const { data: jobs, isLoading: jobsLoading } = useAriaJobs();
  const { data: content, isLoading: contentLoading } = useAriaGeneratedContent();
  const updateStatus = useUpdateContentStatus();
  const bulkUpdate = useBulkUpdateContentStatus();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);

  const activeJobs = useMemo(
    () => (jobs || []).filter((j: any) => !["completed", "failed"].includes(j.status)),
    [jobs]
  );

  const completedJobs = useMemo(
    () => (jobs || []).filter((j: any) => j.status === "completed").slice(0, 5),
    [jobs]
  );

  const captionTypes = ["tiktok_caption", "instagram_caption", "youtube_caption"];
  const postTypes = ["community_post", "tweet_thread", "linkedin_post"];

  const filteredContent = useMemo(() => {
    if (!content) return [];
    if (activeTab === "all") return content;
    if (activeTab === "captions") return content.filter((c: any) => captionTypes.includes(c.content_type));
    if (activeTab === "posts") return content.filter((c: any) => postTypes.includes(c.content_type));
    return content.filter((c: any) => c.content_type === activeTab);
  }, [content, activeTab]);

  const draftCount = useMemo(
    () => (content || []).filter((c: any) => c.status === "draft").length,
    [content]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (status: string) => {
    if (selectedIds.size === 0) return;
    await bulkUpdate.mutateAsync({ contentIds: Array.from(selectedIds), status });
    setSelectedIds(new Set());
    toast.success(`${selectedIds.size} items ${status}`);
  };

  const handleApproveAll = async () => {
    const draftIds = (content || []).filter((c: any) => c.status === "draft").map((c: any) => c.id);
    if (draftIds.length === 0) return;
    await bulkUpdate.mutateAsync({ contentIds: draftIds, status: "approved" });
    toast.success(`${draftIds.length} items approved ✓`);
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Content Studio</h1>
              <p className="text-xs text-muted-foreground">AI-generated content from your streams & videos</p>
            </div>
          </div>
        </div>

        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <div className="mb-6 space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              Processing ({activeJobs.length})
            </h2>
            {activeJobs.map((job: any) => (
              <JobProgressCard key={job.id} job={job} />
            ))}
          </div>
        )}

        {/* Approve All Banner */}
        {draftCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">
                ARIA generated {draftCount} pieces of content
              </p>
              <p className="text-xs text-muted-foreground">Ready to review and approve</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleApproveAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Check className="w-4 h-4" /> Approve All
              </button>
            </div>
          </motion.div>
        )}

        {/* Bulk Action Bar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border shadow-lg"
            >
              <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
              <button onClick={() => handleBulkAction("approved")} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
                Approve
              </button>
              <button onClick={() => handleBulkAction("rejected")} className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20">
                Reject
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium">
                Clear
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-4 scrollbar-hide">
          {CONTENT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Grid */}
        {contentLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredContent.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No content yet</h3>
            <p className="text-sm text-muted-foreground">
              Process a video or stream recording with ARIA to generate content automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredContent.map((item: any) => (
              <ContentCard
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
                onUpdateStatus={(status) => updateStatus.mutate({ contentId: item.id, status })}
                onPlayClip={(playbackId) => setPlayingClipId(playbackId)}
              />
            ))}
          </div>
        )}

        {/* Recent Jobs */}
        {completedJobs.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-foreground mb-3">Recent Jobs</h2>
            <div className="space-y-2">
              {completedJobs.map((job: any) => (
                <JobProgressCard key={job.id} job={job} />
              ))}
            </div>
          </div>
        )}
        {/* Clip Player Modal */}
        <AnimatePresence>
          {playingClipId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setPlayingClipId(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="w-full max-w-2xl rounded-xl overflow-hidden bg-card border border-border"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative aspect-video bg-black">
                  <UPLYMuxPlayer playbackId={playingClipId} autoPlay title="Clip Preview" />
                </div>
                <div className="p-3 flex justify-end">
                  <button
                    onClick={() => setPlayingClipId(null)}
                    className="px-3 py-1.5 rounded-lg bg-secondary text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
