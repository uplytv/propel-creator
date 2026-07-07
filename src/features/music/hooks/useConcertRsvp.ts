import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type RsvpStatus = "going" | "interested" | "not_going";

export interface ConcertRSVP {
  id: string;
  concert_id: string;
  user_id: string;
  status: RsvpStatus;
  remind_me: boolean;
  created_at: string;
  updated_at: string;
}

export function useMyConcertRsvp(concertId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["concert-rsvp", concertId, user?.id],
    queryFn: async () => {
      if (!user || !concertId) return null;
      const { data } = await supabase
        .from("music_concert_rsvps")
        .select("*")
        .eq("concert_id", concertId)
        .eq("user_id", user.id)
        .maybeSingle();
      return (data as ConcertRSVP) ?? null;
    },
    enabled: !!user && !!concertId,
  });
}

export function useConcertRsvpCounts(concertId?: string) {
  return useQuery({
    queryKey: ["concert-rsvp-counts", concertId],
    queryFn: async () => {
      if (!concertId) return { going: 0, interested: 0 };
      const [g, i] = await Promise.all([
        supabase
          .from("music_concert_rsvps")
          .select("id", { count: "exact", head: true })
          .eq("concert_id", concertId)
          .eq("status", "going"),
        supabase
          .from("music_concert_rsvps")
          .select("id", { count: "exact", head: true })
          .eq("concert_id", concertId)
          .eq("status", "interested"),
      ]);
      return { going: g.count ?? 0, interested: i.count ?? 0 };
    },
    enabled: !!concertId,
  });
}

export function useSetConcertRsvp() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      concertId,
      status,
      remindMe = true,
    }: {
      concertId: string;
      status: RsvpStatus;
      remindMe?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_concert_rsvps")
        .upsert(
          {
            concert_id: concertId,
            user_id: user.id,
            status,
            remind_me: remindMe,
          },
          { onConflict: "concert_id,user_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as ConcertRSVP;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["concert-rsvp", vars.concertId] });
      qc.invalidateQueries({ queryKey: ["concert-rsvp-counts", vars.concertId] });
    },
  });
}
