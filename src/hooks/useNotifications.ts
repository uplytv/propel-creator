import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

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
          .from("job_notifications" as any)
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

  // Realtime subscription for both tables
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "campaign_notifications" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["all-notifications", user.id] });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "job_notifications" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["all-notifications", user.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: async ({ id, source }: { id: string; source: "campaign" | "job" }) => {
      const table = source === "campaign" ? "campaign_notifications" : "job_notifications";
      const { error } = await supabase
        .from(table as any)
        .update({ read: true } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await Promise.all([
        supabase
          .from("campaign_notifications" as any)
          .update({ read: true } as any)
          .eq("user_id", user.id)
          .eq("read", false),
        supabase
          .from("job_notifications" as any)
          .update({ read: true } as any)
          .eq("user_id", user.id)
          .eq("read", false),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-notifications"] });
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
