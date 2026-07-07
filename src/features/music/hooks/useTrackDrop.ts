import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface TrackDrop {
  id: string;
  track_id: string;
  drop_at: string;
  hype_message: string | null;
}

export function useTrackDrop(trackId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const drop = useQuery({
    queryKey: ["track-drop", trackId],
    queryFn: async (): Promise<TrackDrop | null> => {
      if (!trackId) return null;
      const { data } = await supabase
        .from("track_drops")
        .select("*")
        .eq("track_id", trackId)
        .maybeSingle();
      return (data as TrackDrop) ?? null;
    },
    enabled: !!trackId,
  });

  const reminder = useQuery({
    queryKey: ["track-drop-reminder", drop.data?.id, user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!drop.data || !user) return false;
      const { data } = await supabase
        .from("track_drop_reminders")
        .select("id")
        .eq("drop_id", drop.data.id)
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!drop.data?.id && !!user,
  });

  const reminderCount = useQuery({
    queryKey: ["track-drop-reminder-count", drop.data?.id],
    queryFn: async (): Promise<number> => {
      if (!drop.data) return 0;
      const { count } = await supabase
        .from("track_drop_reminders")
        .select("id", { count: "exact", head: true })
        .eq("drop_id", drop.data.id);
      return count || 0;
    },
    enabled: !!drop.data?.id,
  });

  const setReminder = useMutation({
    mutationFn: async (on: boolean) => {
      if (!drop.data || !user) throw new Error("Sign in required");
      if (on) {
        const { error } = await supabase
          .from("track_drop_reminders")
          .insert({ drop_id: drop.data.id, user_id: user.id });
        if (error && !error.message.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("track_drop_reminders")
          .delete()
          .eq("drop_id", drop.data.id)
          .eq("user_id", user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["track-drop-reminder", drop.data?.id, user?.id] });
      qc.invalidateQueries({ queryKey: ["track-drop-reminder-count", drop.data?.id] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return {
    drop: drop.data,
    isReminded: reminder.data ?? false,
    reminderCount: reminderCount.data ?? 0,
    setReminder,
  };
}

export function useDropCountdown(dropAt?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!dropAt) return null;
  const diff = new Date(dropAt).getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, done: false };
}
