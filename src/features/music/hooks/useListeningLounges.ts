import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LoungeStatus = "draft" | "scheduled" | "live" | "ended" | "canceled";
export type RsvpStatus = "going" | "maybe" | "canceled";

export function useListeningLounges(artistId?: string, opts?: { includeDrafts?: boolean }) {
  return useQuery({
    queryKey: ["listening-lounges", artistId, opts?.includeDrafts],
    enabled: !!artistId,
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from("music_listening_lounges")
        .select("*")
        .eq("artist_id", artistId!)
        .order("scheduled_at", { ascending: true });
      if (!opts?.includeDrafts) q = q.neq("status", "draft");
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useListeningLounge(id?: string) {
  return useQuery({
    queryKey: ["listening-lounge", id],
    enabled: !!id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_listening_lounges")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyLoungeRsvp(loungeId?: string) {
  return useQuery({
    queryKey: ["lounge-rsvp", loungeId],
    enabled: !!loungeId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("music_lounge_rsvps")
        .select("*")
        .eq("lounge_id", loungeId!)
        .eq("fan_id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateListeningLounge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      album_url?: string;
      cover_url?: string;
      scheduled_at: string;
      status?: LoungeStatus;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_listening_lounges")
        .insert({ ...input, artist_id: auth.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listening-lounges"] }),
  });
}

export function useSetLoungeRsvp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { lounge_id: string; status: RsvpStatus }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_lounge_rsvps")
        .upsert(
          { lounge_id: input.lounge_id, fan_id: auth.user.id, status: input.status },
          { onConflict: "lounge_id,fan_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["lounge-rsvp", vars.lounge_id] });
      qc.invalidateQueries({ queryKey: ["listening-lounge", vars.lounge_id] });
      qc.invalidateQueries({ queryKey: ["listening-lounges"] });
    },
  });
}

export function useAddLoungeReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { lounge_id: string; emoji: string; position_seconds?: number }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_lounge_reactions")
        .insert({ ...input, fan_id: auth.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["lounge-reactions", vars.lounge_id] });
    },
  });
}
