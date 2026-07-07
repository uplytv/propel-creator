import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface Setlist {
  id: string;
  artist_id: string;
  show_title: string;
  venue: string | null;
  show_date: string;
  notes: string | null;
  is_published: boolean;
  created_at: string;
}

export interface SetlistItem {
  id: string;
  setlist_id: string;
  position: number;
  track_title: string;
  track_id: string | null;
  duration_seconds: number | null;
  note: string | null;
}

export interface SetlistRequest {
  id: string;
  setlist_id: string;
  fan_id: string;
  track_title: string;
  note: string | null;
  status: "pending" | "accepted" | "declined";
  vote_count: number;
  created_at: string;
}

export function useSetlists(artistId?: string) {
  return useQuery({
    queryKey: ["setlists", artistId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("music_setlists").select("*").order("show_date", { ascending: true });
      if (artistId) q = q.eq("artist_id", artistId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Setlist[];
    },
    staleTime: 30_000,
  });
}

export function useSetlist(id?: string) {
  return useQuery({
    queryKey: ["setlist", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_setlists")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as Setlist | null;
    },
  });
}

export function useSetlistItems(setlistId?: string) {
  return useQuery({
    queryKey: ["setlist-items", setlistId],
    enabled: !!setlistId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_setlist_items")
        .select("*")
        .eq("setlist_id", setlistId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SetlistItem[];
    },
    staleTime: 30_000,
  });
}

export function useSetlistRequests(setlistId?: string) {
  return useQuery({
    queryKey: ["setlist-requests", setlistId],
    enabled: !!setlistId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_setlist_requests")
        .select("*")
        .eq("setlist_id", setlistId!)
        .order("vote_count", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SetlistRequest[];
    },
    staleTime: 15_000,
  });
}

export function useMySetlistRequestVotes(setlistId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["setlist-my-votes", setlistId, user?.id],
    enabled: !!setlistId && !!user?.id,
    queryFn: async () => {
      const { data: reqs } = await supabase
        .from("music_setlist_requests")
        .select("id")
        .eq("setlist_id", setlistId!);
      const ids = (reqs ?? []).map((r: any) => r.id);
      if (ids.length === 0) return new Set<string>();
      const { data, error } = await supabase
        .from("music_setlist_request_votes")
        .select("request_id")
        .eq("voter_id", user!.id)
        .in("request_id", ids);
      if (error) throw error;
      return new Set((data ?? []).map((v: any) => v.request_id as string));
    },
  });
}

export function useSubmitSetlistRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { setlist_id: string; track_title: string; note?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_setlist_requests")
        .insert({
          setlist_id: input.setlist_id,
          fan_id: user.id,
          track_title: input.track_title,
          note: input.note ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SetlistRequest;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["setlist-requests", vars.setlist_id] });
    },
  });
}

export function useToggleSetlistRequestVote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { request_id: string; setlist_id: string; voted: boolean }) => {
      if (!user?.id) throw new Error("Not authenticated");
      if (input.voted) {
        const { error } = await supabase
          .from("music_setlist_request_votes")
          .delete()
          .eq("request_id", input.request_id)
          .eq("voter_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("music_setlist_request_votes")
          .insert({ request_id: input.request_id, voter_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["setlist-requests", vars.setlist_id] });
      qc.invalidateQueries({ queryKey: ["setlist-my-votes", vars.setlist_id] });
    },
  });
}
