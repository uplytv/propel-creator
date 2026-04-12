import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useAttendance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: myAttendance = [], isLoading } = useQuery({
    queryKey: ["attendance", "mine", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .gte("attend_date", new Date().toISOString().split("T")[0]);
      return data || [];
    },
    enabled: !!user,
    staleTime: 30_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  const markAttending = useMutation({
    mutationFn: async (params: { eventId?: string; status: "going" | "maybe"; date: string }) => {
      if (!user) throw new Error("Not authenticated");

      // For general "going out" without event, find existing record by date + null event
      if (!params.eventId) {
        // Delete any existing record for this date with no event
        await (supabase as any)
          .from("attendance")
          .delete()
          .eq("user_id", user.id)
          .eq("attend_date", params.date)
          .is("event_id", null);

        // Insert new record
        const { error } = await (supabase as any).from("attendance").insert({
          user_id: user.id,
          event_id: null,
          status: params.status,
          attend_date: params.date,
        });
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("attendance").upsert(
          {
            user_id: user.id,
            event_id: params.eventId,
            status: params.status,
            attend_date: params.date,
          },
          { onConflict: "user_id,event_id" }
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });

  const clearAttendance = useMutation({
    mutationFn: async (params: { date: string; eventId?: string }) => {
      if (!user) return;
      let query = (supabase as any)
        .from("attendance")
        .delete()
        .eq("user_id", user.id)
        .eq("attend_date", params.date);

      if (params.eventId) {
        query = query.eq("event_id", params.eventId);
      } else {
        query = query.is("event_id", null);
      }
      await query;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });

  const removeAttendance = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) return;
      await (supabase as any).from("attendance").delete().eq("user_id", user.id).eq("event_id", eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });

  const getAttendees = async (eventId: string) => {
    const { data } = await (supabase as any)
      .from("attendance")
      .select("*, profiles:user_id(display_name, avatar_url, username)")
      .eq("event_id", eventId);
    return data || [];
  };

  const getGoingOutCount = async (date: string) => {
    const { count } = await (supabase as any)
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .eq("attend_date", date)
      .eq("status", "going");
    return count || 0;
  };

  return {
    myAttendance,
    isLoading,
    markAttending: markAttending.mutateAsync,
    clearAttendance: clearAttendance.mutateAsync,
    removeAttendance: removeAttendance.mutate,
    getAttendees,
    getGoingOutCount,
  };
}
