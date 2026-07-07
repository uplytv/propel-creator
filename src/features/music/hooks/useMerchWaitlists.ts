import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface MerchWaitlist {
  id: string;
  artist_id: string;
  drop_title: string;
  product_name: string;
  image_url: string | null;
  launch_at: string | null;
  max_signups: number | null;
  signup_count: number;
  status: "open" | "launched" | "canceled";
  notes: string | null;
}

export interface MerchWaitlistSignup {
  id: string;
  waitlist_id: string;
  fan_id: string;
  email: string | null;
  size_pref: string | null;
  notified_at: string | null;
  created_at: string;
}

export function useMerchWaitlists(artistId?: string) {
  return useQuery({
    queryKey: ["merch-waitlists", artistId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("music_merch_waitlists")
        .select("*")
        .order("launch_at", { ascending: true, nullsFirst: false });
      if (artistId) q = q.eq("artist_id", artistId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MerchWaitlist[];
    },
    staleTime: 30_000,
  });
}

export function useMerchWaitlist(id?: string) {
  return useQuery({
    queryKey: ["merch-waitlist", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_merch_waitlists")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as MerchWaitlist | null;
    },
  });
}

export function useMyMerchWaitlistSignup(waitlistId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["merch-waitlist-mine", waitlistId, user?.id],
    enabled: !!waitlistId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_merch_waitlist_signups")
        .select("*")
        .eq("waitlist_id", waitlistId!)
        .eq("fan_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as MerchWaitlistSignup | null;
    },
  });
}

export function useJoinMerchWaitlist() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { waitlist_id: string; email?: string; size_pref?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("music_merch_waitlist_signups")
        .insert({
          waitlist_id: input.waitlist_id,
          fan_id: user.id,
          email: input.email ?? null,
          size_pref: input.size_pref ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as MerchWaitlistSignup;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["merch-waitlist-mine", vars.waitlist_id] });
      qc.invalidateQueries({ queryKey: ["merch-waitlist", vars.waitlist_id] });
      qc.invalidateQueries({ queryKey: ["merch-waitlists"] });
    },
  });
}

export function useLeaveMerchWaitlist() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (waitlist_id: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("music_merch_waitlist_signups")
        .delete()
        .eq("waitlist_id", waitlist_id)
        .eq("fan_id", user.id);
      if (error) throw error;
      return waitlist_id;
    },
    onSuccess: (waitlist_id) => {
      qc.invalidateQueries({ queryKey: ["merch-waitlist-mine", waitlist_id] });
      qc.invalidateQueries({ queryKey: ["merch-waitlist", waitlist_id] });
      qc.invalidateQueries({ queryKey: ["merch-waitlists"] });
    },
  });
}
