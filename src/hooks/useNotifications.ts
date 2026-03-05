import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  source: "campaign" | "job";
  // campaign-specific
  campaign_id?: string;
  // job-specific
  job_id?: string;
  application_id?: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["all-notifications", user?.id],
    queryFn: async () => {
      // Fetch both campaign and job notifications in parallel
      const [campaignRes, jobRes] = await Promise.all([
        supabase
          .from("campaign_notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("job_notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const campaignNotifs: AppNotification[] = (campaignRes.data ?? []).map((n: any) => ({
        ...n,
        source: "campaign" as const,
      }));

      const jobNotifs: AppNotification[] = (jobRes.data ?? []).map((n: any) => ({
        ...n,
        source: "job" as const,
      }));

      // Merge and sort by created_at descending
      return [...campaignNotifs, ...jobNotifs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 30);
    },
    enabled: !!user,
  });

  // Track if initial load is done to avoid toasting old notifications
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!query.isLoading && query.data) {
      initialLoadDone.current = true;
    }
  }, [query.isLoading, query.data]);

  // Realtime subscription for both tables — with toast on new inserts
  useEffect(() => {
    if (!user) return;

    const showToast = (payload: any, source: string) => {
      if (!initialLoadDone.current) return;
      const row = payload.new as any;
      if (row) {
        const icon = source === "job" ? "💼" : "📢";
        toast(row.title, {
          description: row.message,
          icon,
          duration: 5000,
        });
        // Play notification sound if enabled (Web Audio API for reliability)
        if (localStorage.getItem("notif_sound_enabled") !== "false") {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const playTone = (freq: number, startTime: number, duration: number) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = freq;
              osc.type = "sine";
              gain.gain.setValueAtTime(0.3, startTime);
              gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
              osc.start(startTime);
              osc.stop(startTime + duration);
            };
            // Two-tone chime
            playTone(830, ctx.currentTime, 0.15);
            playTone(1100, ctx.currentTime + 0.15, 0.2);
          } catch (e) {
            console.warn("Notification sound failed:", e);
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ["all-notifications", user.id] });
    };

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "campaign_notifications" },
        (payload) => showToast(payload, "campaign")
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "job_notifications" },
        (payload) => showToast(payload, "job")
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: async ({ id, source }: { id: string; source: "campaign" | "job" }) => {
      if (source === "campaign") {
        const { error } = await supabase
          .from("campaign_notifications")
          .update({ read: true })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("job_notifications")
          .update({ read: true })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-notifications", user?.id] });
    },
    onError: (err: any) => {
      console.error("Mark read error:", err);
      toast.error("Failed to mark notification as read");
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const [campRes, jobRes] = await Promise.all([
        supabase
          .from("campaign_notifications")
          .update({ read: true })
          .eq("user_id", user.id)
          .eq("read", false),
        supabase
          .from("job_notifications")
          .update({ read: true })
          .eq("user_id", user.id)
          .eq("read", false),
      ]);
      if (campRes.error) throw campRes.error;
      if (jobRes.error) throw jobRes.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-notifications", user?.id] });
    },
    onError: (err: any) => {
      console.error("Mark all read error:", err);
      toast.error("Failed to mark all as read");
    },
  });

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    markRead: (id: string, source: "campaign" | "job" = "campaign") => markReadMutation.mutateAsync({ id, source }),
    markAllRead: markAllReadMutation.mutateAsync,
  };
}
