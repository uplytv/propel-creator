import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Calendar, Clock, Film, FileText, Loader2, Check, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface QueueItem {
  id: string;
  content_id: string | null;
  platform: string;
  scheduled_at: string;
  status: string;
  title?: string;
  content_type?: string;
}

export function ContentScheduler() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ["content-schedule", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aria_distribution_queue")
        .select("id, content_id, platform, scheduled_at, status")
        .eq("creator_id", user!.id)
        .order("scheduled_at", { ascending: true })
        .limit(20);
      if (error) throw error;

      // Fetch content titles
      const contentIds = (data || []).map((d: any) => d.content_id).filter(Boolean);
      let contentMap = new Map();
      if (contentIds.length > 0) {
        const { data: contents } = await supabase
          .from("aria_generated_content")
          .select("id, title, content_type")
          .in("id", contentIds);
        contentMap = new Map((contents || []).map((c: any) => [c.id, c]));
      }

      return (data || []).map((item: any) => ({
        ...item,
        title: contentMap.get(item.content_id)?.title || "Untitled",
        content_type: contentMap.get(item.content_id)?.content_type || "post",
      })) as QueueItem[];
    },
  });

  const cancelItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("aria_distribution_queue")
        .delete()
        .eq("id", id)
        .eq("creator_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-schedule"] });
      toast({ title: "Removed from schedule" });
    },
  });

  const pending = queue.filter((q) => q.status === "pending" || q.status === "scheduled");
  const published = queue.filter((q) => q.status === "published" || q.status === "sent");

  const platformEmoji: Record<string, string> = {
    tiktok: "🎵", instagram: "📸", youtube: "▶️", twitter: "🐦",
    linkedin: "💼", uply: "⚡", community: "💬", email: "📧",
  };

  if (isLoading) return null;
  if (queue.length === 0) return null;

  return (
    <Card className="border-border mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Content Schedule
          {pending.length > 0 && (
            <span className="ml-auto text-[10px] font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {pending.length} queued
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {pending.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              {item.content_type === "short_clip" ? (
                <Film className="w-4 h-4 text-primary" />
              ) : (
                <FileText className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">{item.title}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{platformEmoji[item.platform] || "🌐"} {item.platform}</span>
                <span className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {format(new Date(item.scheduled_at), "MMM d, h:mm a")}
                </span>
              </div>
            </div>
            <button
              onClick={() => cancelItem.mutate(item.id)}
              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {published.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground mb-1.5">Recently published</p>
            {published.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-2 py-1">
                <Check className="w-3 h-3 text-primary" />
                <span className="text-xs text-muted-foreground truncate flex-1">{item.title}</span>
                <span className="text-[10px] text-muted-foreground">
                  {platformEmoji[item.platform] || ""} {format(new Date(item.scheduled_at), "MMM d")}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
