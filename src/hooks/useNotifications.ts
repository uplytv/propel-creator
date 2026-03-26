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
  source: "campaign" | "job" | "social";
  // campaign-specific
  campaign_id?: string;
  // job-specific
  job_id?: string;
  application_id?: string;
  // social-specific
  actor_id?: string;
  reference_id?: string;
  link?: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["all-notifications", user?.id],
    queryFn: async () => {
      const [campaignRes, jobRes, socialRes] = await Promise.all([
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
        supabase
          .from("notifications")
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

      const socialNotifs: AppNotification[] = (socialRes.data ?? []).map((n: any) => ({
        ...n,
        source: "social" as const,
      }));

      return [...campaignNotifs, ...jobNotifs, ...socialNotifs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 40);
    },
    enabled: !!user,
  });

  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!query.isLoading && query.data) {
      initialLoadDone.current = true;
    }
  }, [query.isLoading, query.data]);

  useEffect(() => {
    if (!user) return;

    const showToast = (payload: { new: Record<string, unknown> }, source: string) => {
      if (!initialLoadDone.current) return;
      const row = payload.new;
      if (row) {
        const icon = source === "job" ? "💼" : source === "social" ? "💬" : "📢";
        toast(row.title as string, {
          description: row.message as string,
          icon,
          duration: 5000,
        });
        if (localStorage.getItem("notif_sound_enabled") !== "false") {
          try {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const ctx = new AudioCtx();
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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => showToast(payload, "social")
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const getTable = (source: string) => {
    if (source === "campaign") return "campaign_notifications" as const;
    if (source === "job") return "job_notifications" as const;
    return "notifications" as const;
  };

  const markReadMutation = useMutation({
    mutationFn: async ({ id, source }: { id: string; source: "campaign" | "job" | "social" }) => {
      const { error } = await supabase.from(getTable(source)).update({ read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-notifications", user?.id] }),
    onError: (err: any) => { console.error("Mark read error:", err); toast.error("Failed to mark notification as read"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, source }: { id: string; source: "campaign" | "job" | "social" }) => {
      const { error } = await supabase.from(getTable(source)).delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["all-notifications", user?.id] });
      const prev = queryClient.getQueryData<AppNotification[]>(["all-notifications", user?.id]);
      queryClient.setQueryData<AppNotification[]>(["all-notifications", user?.id], (old) =>
        (old ?? []).filter((n) => n.id !== id)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["all-notifications", user?.id], ctx.prev);
      toast.error("Failed to delete notification");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["all-notifications", user?.id] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const [campRes, jobRes, socialRes] = await Promise.all([
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
        supabase
          .from("notifications")
          .update({ read: true })
          .eq("user_id", user.id)
          .eq("read", false),
      ]);
      if (campRes.error) throw campRes.error;
      if (jobRes.error) throw jobRes.error;
      if (socialRes.error) throw socialRes.error;
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
    markRead: (id: string, source: "campaign" | "job" | "social" = "campaign") => markReadMutation.mutateAsync({ id, source }),
    markAllRead: markAllReadMutation.mutateAsync,
    deleteNotification: (id: string, source: "campaign" | "job" | "social" = "campaign") => deleteMutation.mutateAsync({ id, source }),
  };
}
