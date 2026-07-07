import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface GuestList {
  id: string;
  artist_id: string;
  show_title: string;
  venue: string | null;
  show_date: string;
  capacity: number;
  spots_used: number;
  status: "open" | "closed" | "canceled";
  notes: string | null;
}

export interface GuestRequest {
  id: string;
  guest_list_id: string;
  fan_id: string;
  full_name: string;
  plus_one_name: string | null;
  status: "pending" | "approved" | "declined" | "checked_in";
  note: string | null;
  created_at: string;
}

export function useGuestLists(artistId?: string) {
  return useQuery({
    queryKey: ["guest-lists", artistId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("music_show_guest_lists").select("*").order("show_date", { ascending: true });
      if (artistId) q = q.eq("artist_id", artistId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as GuestList[];
    },
    staleTime: 30_000,
  });
}

export function useGuestList(id?: string) {
  return useQuery({
    queryKey: ["guest-list", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_show_guest_lists")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as GuestList | null;
    },
  });
}

export function useMyGuestRequest(guestListId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["guest-request-mine", guestListId, user?.id],
    enabled: !!guestListId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_show_guest_requests")
        .select("*")
        .eq("guest_list_id", guestListId!)
        .eq("fan_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as GuestRequest | null;
    },
  });
}

export function useGuestRequestsForList(guestListId?: string) {
  return useQuery({
    queryKey: ["guest-requests", guestListId],
    enabled: !!guestListId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_show_guest_requests")
        .select("*")
        .eq("guest_list_id", guestListId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GuestRequest[];
    },
    staleTime: 15_000,
  });
}

export function useSubmitGuestRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      guest_list_id: string;
      full_name: string;
      plus_one_name?: string;
      note?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_show_guest_requests")
        .insert({
          guest_list_id: input.guest_list_id,
          fan_id: user.id,
          full_name: input.full_name,
          plus_one_name: input.plus_one_name ?? null,
          note: input.note ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as GuestRequest;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["guest-requests", vars.guest_list_id] });
      qc.invalidateQueries({ queryKey: ["guest-request-mine", vars.guest_list_id] });
      qc.invalidateQueries({ queryKey: ["guest-list", vars.guest_list_id] });
    },
  });
}

export function useUpdateGuestRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      request_id: string;
      guest_list_id: string;
      status: GuestRequest["status"];
    }) => {
      const { error } = await supabase
        .from("music_show_guest_requests")
        .update({ status: input.status })
        .eq("id", input.request_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["guest-requests", vars.guest_list_id] });
      qc.invalidateQueries({ queryKey: ["guest-list", vars.guest_list_id] });
    },
  });
}
