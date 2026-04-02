import { useState } from "react";
import { CalendarIcon, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import ScheduleShareModal from "./ScheduleShareModal";
import { useApp } from "@/context/AppContext";

const categories = [
  "Business Strategy", "Fitness & Nutrition", "Music Production", "Photography",
  "UX Design", "Web Development", "Marketing", "Writing", "Finance", "AI & Tech",
];

export default function ScheduleStreamTab() {
  const { user } = useAuth();
  const { profile } = useApp();
  const toast = sonnerToast;
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [saving, setSaving] = useState(false);
  const [shareStream, setShareStream] = useState<any>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const { data: scheduled = [] } = useQuery({
    queryKey: ["scheduled-streams", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("scheduled_streams")
        .select("*")
        .eq("creator_id", user!.id)
        .order("scheduled_at", { ascending: true });
      return data || [];
    },
  });

  // Check if this is their first schedule
  const isFirstSchedule = (scheduled as any[]).filter((s: any) => s.status === "scheduled").length === 0;

  // Get community member count
  const { data: memberCount } = useQuery({
    queryKey: ["community-member-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("community_members")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", user!.id);
      return count || 0;
    },
  });

  // Weekly schedule share
  const upcomingThisWeek = (scheduled as any[]).filter((s: any) => {
    const d = new Date(s.scheduled_at);
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return s.status === "scheduled" && d >= now && d <= weekLater;
  });

  const handleShareWeeklySchedule = async () => {
    const displayName = (profile as any)?.display_name || "A creator";
    const username = (profile as any)?.username || "me";
    const lines = upcomingThisWeek.map((s: any) =>
      `${format(new Date(s.scheduled_at), "EEEE")}: ${s.title} · ${format(new Date(s.scheduled_at), "h:mm a")} ET`
    );
    const shareText = `📺 ${displayName}'s show schedule on @uplyTV this week:\n\n${lines.join("\n")}\n\nFollow their channel → uply.tv/${username}\nSet reminders for each show 🔔\n\n#UPLY`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${displayName}'s schedule on UPLY`, text: shareText, url: `https://uply.tv/${username}` });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(shareText);
      sonnerToast.success("Schedule copied — paste it anywhere 📋");
    } catch {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
    }
  };

  const handleSchedule = async () => {
    if (!title.trim() || !scheduledAt || !user) return;
    setSaving(true);
    try {
      const { data: newStream, error } = await supabase.from("scheduled_streams").insert({
        creator_id: user.id,
        title: title.trim(),
        description: description.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
        category,
        status: "scheduled",
      }).select().single();
      if (error) throw error;

      // Notify all community members
      const { data: members } = await supabase
        .from("community_members")
        .select("user_id")
        .eq("creator_id", user.id);

      const displayName = user.user_metadata?.full_name || (profile as any)?.display_name || "A creator";
      const dateObj = new Date(scheduledAt);

      if (members?.length) {
        const notifications = members
          .filter((m) => m.user_id !== user.id)
          .map((m) => ({
            user_id: m.user_id,
            type: "new_stream_scheduled",
            title: `📺 ${displayName} just scheduled a show`,
            message: `${displayName} is going live ${format(dateObj, "EEEE 'at' h:mm a")} ET. Tap to set a reminder.`,
            actor_id: user.id,
          }));
        if (notifications.length > 0) {
          await supabase.from("notifications").insert(notifications);
        }
      }

      // Also notify followers
      const { data: followers } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id);

      if (followers?.length) {
        const followerNotifs = followers
          .filter((f) => f.follower_id !== user.id)
          .filter((f) => !members?.some((m) => m.user_id === f.follower_id))
          .map((f) => ({
            user_id: f.follower_id,
            type: "stream_scheduled",
            title: `${displayName} is going live on ${format(dateObj, "MMM d")}`,
            message: description.slice(0, 160) || title,
            actor_id: user.id,
          }));
        if (followerNotifs.length > 0) {
          await supabase.from("notifications").insert(followerNotifs);
        }
      }

      // Show celebration toast for first schedule
      if (isFirstSchedule) {
        const username = (profile as any)?.username || "me";
        sonnerToast(
          <div className="w-full">
            <div className="border-l-4 border-primary bg-background rounded-r-lg p-4 space-y-2">
              <p className="font-['Space_Grotesk'] font-bold text-sm text-foreground">
                📺 Your first show is scheduled!
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{title.trim()}</span> · {format(dateObj, "EEEE")} at {format(dateObj, "h:mm a")} ET
              </p>
              <p className="text-xs text-muted-foreground">
                UPLY will notify your community 15 minutes before you go live.
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{memberCount || 0}</span> members will be reminded automatically.
              </p>
              <button
                onClick={() => {
                  setShareStream({ ...newStream, title: title.trim(), scheduled_at: new Date(scheduledAt).toISOString(), category });
                  setShareOpen(true);
                }}
                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                Share your schedule →
              </button>
            </div>
          </div>,
          { duration: 8000, unstyled: true, className: "w-full" }
        );
      } else {
        toast({ title: "Stream scheduled! 📅", description: `Scheduled for ${format(dateObj, "PPpp")}` });
      }

      setTitle("");
      setDescription("");
      setScheduledAt("");
      queryClient.invalidateQueries({ queryKey: ["scheduled-streams"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Stream Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What will you stream about?"
          className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell your audience what to expect..."
          rows={3}
          className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary" />
          Date & Time
        </label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
          className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

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

      <Button
        variant="hero"
        size="xl"
        onClick={handleSchedule}
        disabled={!title.trim() || !scheduledAt || saving}
        className="w-full"
      >
        {saving ? (
          <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Scheduling...</>
        ) : (
          <><CalendarIcon className="w-5 h-5 mr-2" /> Schedule Stream</>
        )}
      </Button>

      {/* Upcoming scheduled streams */}
      {(scheduled as any[]).filter((s: any) => s.status === "scheduled").length > 0 && (
        <div className="space-y-3 mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Upcoming Scheduled</h3>
            {upcomingThisWeek.length > 0 && (
              <button
                onClick={handleShareWeeklySchedule}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <Share2 className="w-3 h-3" /> Share Schedule
              </button>
            )}
          </div>
          {(scheduled as any[])
            .filter((s: any) => s.status === "scheduled")
            .map((s: any) => (
              <div key={s.id} className="glass-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(s.scheduled_at), "PPpp")}
                  </p>
                </div>
                <button
                  onClick={() => { setShareStream(s); setShareOpen(true); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 transition-colors"
                  title="Share"
                >
                  <Share2 className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </button>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                  📅 Scheduled
                </span>
              </div>
            ))}
        </div>
      )}

      {/* Share Modal */}
      {shareStream && (
        <ScheduleShareModal
          open={shareOpen}
          onClose={() => { setShareOpen(false); setShareStream(null); }}
          stream={shareStream}
          creator={{
            display_name: (profile as any)?.display_name || user?.user_metadata?.full_name || "Creator",
            username: (profile as any)?.username || "me",
            channel_category: (profile as any)?.channel_category,
          }}
        />
      )}
    </div>
  );
}
