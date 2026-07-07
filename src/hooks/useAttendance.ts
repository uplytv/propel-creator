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
      const { data } = await supabase
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
        await supabase
          .from("attendance")
          .delete()
          .eq("user_id", user.id)
          .eq("attend_date", params.date)
          .is("event_id", null);

        // Insert new record
        const { error } = await supabase.from("attendance").insert({
          user_id: user.id,
          event_id: null,
          status: params.status,
          attend_date: params.date,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance").upsert(
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
      let query = supabase
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
      await supabase.from("attendance").delete().eq("user_id", user.id).eq("event_id", eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });

  // ============ GLOBAL (Ticketmaster/Eventbrite) EVENTS ============
  const markAttendingGlobal = useMutation({
    mutationFn: async (params: {
      globalEventId: string;
      eventTitle: string;
      eventDate?: string;
      status?: "going" | "maybe";
    }) => {
      if (!user) throw new Error("Not authenticated");
      const date = params.eventDate
        ? new Date(params.eventDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("attendance").upsert(
        {
          user_id: user.id,
          global_event_id: params.globalEventId,
          event_title: params.eventTitle,
          event_date: params.eventDate || null,
          status: params.status || "going",
          attend_date: date,
        },
        { onConflict: "user_id,global_event_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["global-event-attendees"] });
    },
  });

  const removeGlobalAttendance = useMutation({
    mutationFn: async (globalEventId: string) => {
      if (!user) return;
      await supabase
        .from("attendance")
        .delete()
        .eq("user_id", user.id)
        .eq("global_event_id", globalEventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["global-event-attendees"] });
    },
  });

  const isGoingToGlobalEvent = (globalEventId: string): boolean =>
    (myAttendance as any[]).some(
      (a) => a.global_event_id === globalEventId && a.status === "going"
    );

  const isGoingToEvent = (eventId: string): boolean =>
    (myAttendance as any[]).some(
      (a) => a.event_id === eventId && a.status === "going"
    );

  const getGlobalEventAttendees = async (globalEventId: string) => {
    const { data } = await supabase
      .from("attendance")
      .select("*, profiles:user_id(display_name, avatar_url, username)")
      .eq("global_event_id", globalEventId);
    return data || [];
  };

  const getAttendees = async (eventId: string) => {
    const { data } = await supabase
      .from("attendance")
      .select("*, profiles:user_id(display_name, avatar_url, username)")
      .eq("event_id", eventId);
    return data || [];
  };

  const getGoingOutCount = async (date: string) => {
    const { count } = await supabase
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
    // Global events
    markAttendingGlobal: markAttendingGlobal.mutateAsync,
    removeGlobalAttendance: removeGlobalAttendance.mutateAsync,
    isGoingToGlobalEvent,
    isGoingToEvent,
    getGlobalEventAttendees,
  };
}
