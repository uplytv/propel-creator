import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
  reference_id: string | null;
}

const ADMIN_TYPES = [
  "admin_new_user", "admin_new_creator", "admin_new_subscription",
  "admin_subscription_canceled", "admin_new_transaction", "admin_new_waitlist",
  "admin_stream_started", "admin_stripe_failure", "admin_stripe_verified",
  "admin_new_tip", "admin_ticket_sold", "admin_dns_failure", "admin_payment_rate_low",
];

const CRITICAL_TYPES = ["admin_stripe_failure", "admin_dns_failure", "admin_payment_rate_low"];

type Category = "money" | "users" | "streams" | "technical";

export function getCategory(type: string): Category {
  if (["admin_new_transaction", "admin_new_subscription", "admin_subscription_canceled", "admin_new_tip", "admin_ticket_sold"].includes(type)) return "money";
  if (["admin_new_user", "admin_new_creator", "admin_new_waitlist"].includes(type)) return "users";
  if (["admin_stream_started"].includes(type)) return "streams";
  return "technical";
}

export function getSeverity(type: string): "success" | "warning" | "critical" | "info" {
  if (CRITICAL_TYPES.includes(type)) return "critical";
  if (["admin_subscription_canceled"].includes(type)) return "warning";
  if (["admin_stripe_verified", "admin_new_subscription", "admin_new_creator"].includes(type)) return "success";
  return "info";
}

export function useAdminNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [realtimeEvents, setRealtimeEvents] = useState<AdminNotification[]>([]);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, message, link, read, created_at, reference_id")
        .eq("user_id", user!.id)
        .in("type", ADMIN_TYPES)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as AdminNotification[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("admin-notif-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const n = payload.new as AdminNotification;
        if (ADMIN_TYPES.includes(n.type)) {
          setRealtimeEvents(prev => [n, ...prev]);
          qc.invalidateQueries({ queryKey: ["admin-notifications"] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .in("type", ADMIN_TYPES)
        .eq("read", false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });

  const allNotifs = [...realtimeEvents.filter(re => !notifications.find(n => n.id === re.id)), ...notifications];
  const unreadCount = allNotifs.filter(n => !n.read).length;
  const criticalUnread = allNotifs.filter(n => !n.read && CRITICAL_TYPES.includes(n.type));

  return {
    notifications: allNotifs,
    unreadCount,
    criticalUnread,
    isLoading,
    markRead: markRead.mutateAsync,
    markAllRead: markAllRead.mutateAsync,
  };
}

export interface AdminNotifConfig {
  id: string;
  event_type: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  min_amount: number;
  batch_window_seconds: number;
}

export function useAdminNotifConfig() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["admin-notif-config", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notification_config")
        .select("*")
        .eq("admin_id", user!.id);
      if (error) throw error;
      return (data || []) as unknown as AdminNotifConfig[];
    },
    enabled: !!user,
  });

  const update = useMutation({
    mutationFn: async (params: { event_type: string; field: string; value: any }) => {
      const { error } = await supabase
        .from("admin_notification_config")
        .update({ [params.field]: params.value })
        .eq("admin_id", user!.id)
        .eq("event_type", params.event_type);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-notif-config"] }),
  });

  return { configs, isLoading, updateConfig: update.mutateAsync };
}
