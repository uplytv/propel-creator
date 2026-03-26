import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useScheduledStreams(creatorId?: string) {
  return useQuery({
    queryKey: ["scheduled-streams", creatorId || "all"],
    queryFn: async () => {
      let query = supabase
        .from("scheduled_streams")
        .select("*")
        .eq("status", "scheduled")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true });

      if (creatorId) {
        query = query.eq("creator_id", creatorId);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useStreamReminder(scheduledStreamId: string, userId?: string) {
  return useQuery({
    queryKey: ["stream-reminder", scheduledStreamId, userId],
    enabled: !!userId && !!scheduledStreamId,
    queryFn: async () => {
      const { data } = await supabase
        .from("stream_reminders")
        .select("id")
        .eq("scheduled_stream_id", scheduledStreamId)
        .eq("user_id", userId!)
        .maybeSingle();
      return !!data;
    },
  });
}
