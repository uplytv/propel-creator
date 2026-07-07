import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const sb = supabase;

export interface MusicNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link_path: string | null;
  cover_url: string | null;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
}

export function useMusicNotifications(limit = 30) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery<MusicNotification[]>({
    queryKey: ["music-notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await sb
        .from("music_notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data as MusicNotification[]) ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = sb
      .channel(`music-notifs-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "music_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => qc.invalidateQueries({ queryKey: ["music-notifications", user.id] })
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [user, qc]);

  return query;
}

export function useUnreadMusicCount() {
  const { user } = useAuth();
  return useQuery<number>({
    queryKey: ["music-notifications-unread", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count } = await sb
        .from("music_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .is("read_at", null);
      return count ?? 0;
    },
  });
}

export function useMarkNotificationsRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id?: string) => {
      if (!user) return;
      const q = sb
        .from("music_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (id) await q.eq("id", id);
      else await q;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["music-notifications"] });
      qc.invalidateQueries({ queryKey: ["music-notifications-unread"] });
    },
  });
}
