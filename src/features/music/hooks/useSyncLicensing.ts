import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SyncListing = {
  id: string;
  owner_id: string;
  track_id: string | null;
  title: string;
  artist_name: string;
  description: string | null;
  mood: string[] | null;
  genre: string[] | null;
  tags: string[] | null;
  min_fee_cents: number | null;
  max_fee_cents: number | null;
  exclusive: boolean;
  preview_url: string | null;
  artwork_url: string | null;
  status: string;
  created_at: string;
};

export type SyncBrief = {
  id: string;
  owner_id: string;
  project_name: string;
  project_type: string;
  description: string | null;
  reference_url: string | null;
  mood: string[] | null;
  genre: string[] | null;
  budget_cents: number | null;
  deadline: string | null;
  status: string;
  created_at: string;
};

export type SyncPitch = {
  id: string;
  brief_id: string;
  listing_id: string | null;
  pitcher_id: string;
  message: string | null;
  proposed_fee_cents: number | null;
  status: string;
  created_at: string;
};

export function useSyncListings() {
  return useQuery({
    queryKey: ["sync-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_sync_listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SyncListing[];
    },
  });
}

export function useSyncBriefs() {
  return useQuery({
    queryKey: ["sync-briefs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_sync_briefs")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SyncBrief[];
    },
  });
}

export function useBriefPitches(briefId: string | undefined) {
  return useQuery({
    queryKey: ["sync-pitches", briefId],
    enabled: !!briefId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_sync_pitches")
        .select("*")
        .eq("brief_id", briefId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SyncPitch[];
    },
  });
}

export function useCreateSyncListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<SyncListing> & { title: string; artist_name: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("music_sync_listings")
        .insert({ ...input, owner_id: u.user.id })
        .select()
        .single();
      if (error) throw error;
      return data as SyncListing;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sync-listings"] }),
  });
}

export function useCreateSyncBrief() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<SyncBrief> & { project_name: string; project_type: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("music_sync_briefs")
        .insert({ ...input, owner_id: u.user.id })
        .select()
        .single();
      if (error) throw error;
      return data as SyncBrief;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sync-briefs"] }),
  });
}

export function useSubmitPitch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { brief_id: string; listing_id?: string; message?: string; proposed_fee_cents?: number }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("music_sync_pitches")
        .insert({ ...input, pitcher_id: u.user.id })
        .select()
        .single();
      if (error) throw error;
      return data as SyncPitch;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["sync-pitches", v.brief_id] }),
  });
}

export function useUpdatePitchStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("music_sync_pitches").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sync-pitches"] }),
  });
}
