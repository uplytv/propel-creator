import { useState } from "react";
import { CalendarIcon, Clock, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const categories = [
  "Business Strategy", "Fitness & Nutrition", "Music Production", "Photography",
  "UX Design", "Web Development", "Marketing", "Writing", "Finance", "AI & Tech",
];

export default function ScheduleStreamTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [saving, setSaving] = useState(false);

  const { data: scheduled = [] } = useQuery({
    queryKey: ["scheduled-streams", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("scheduled_streams" as any)
        .select("*")
        .eq("creator_id", user!.id)
        .order("scheduled_at", { ascending: true });
      return data || [];
    },
  });

  const handleSchedule = async () => {
    if (!title.trim() || !scheduledAt || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("scheduled_streams" as any).insert({
        creator_id: user.id,
        title: title.trim(),
        description: description.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
        category,
        status: "scheduled",
      });
      if (error) throw error;

      // Notify followers
      const { data: followers } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id);

      if (followers?.length) {
        const notifications = followers.map((f) => ({
          user_id: f.follower_id,
          type: "stream_scheduled",
          title: `${user.user_metadata?.full_name || "A creator"} is going live on ${format(new Date(scheduledAt), "MMM d")}`,
          message: description.slice(0, 160) || title,
          actor_id: user.id,
        }));
        await supabase.from("notifications").insert(notifications);
      }

      toast({ title: "Stream scheduled! 📅", description: `Scheduled for ${format(new Date(scheduledAt), "PPpp")}` });
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
      {(scheduled as any[]).length > 0 && (
        <div className="space-y-3 mt-6">
          <h3 className="text-sm font-bold text-foreground">Upcoming Scheduled</h3>
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
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                  📅 Scheduled
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
