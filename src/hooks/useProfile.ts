import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  username?: string | null;
  avatar_url: string | null;
  bio: string | null;
  website?: string | null;
  creator_type: string | null;
  creator_stage: string | null;
  creator_challenge: string | null;
  tier: number;
  tier_name: string;
  members: number;
  mrr: number;
  total_revenue: number;
  health_score: number;
  credits_balance: number;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data as unknown as Profile;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error("Not authenticated");
      // Map Profile fields to DB column names
      const dbUpdates: ProfileUpdate = {};
      if (updates.display_name !== undefined) dbUpdates.display_name = updates.display_name;
      if (updates.avatar_url !== undefined) dbUpdates.avatar_url = updates.avatar_url;
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
      if (updates.creator_type !== undefined) dbUpdates.creator_type = updates.creator_type;
      if (updates.creator_stage !== undefined) dbUpdates.creator_stage = updates.creator_stage;
      if (updates.creator_challenge !== undefined) dbUpdates.creator_challenge = updates.creator_challenge;
      if (updates.tier !== undefined) dbUpdates.tier = updates.tier;
      if (updates.tier_name !== undefined) dbUpdates.tier_name = updates.tier_name;
      if (updates.members !== undefined) dbUpdates.members = updates.members;
      if (updates.mrr !== undefined) dbUpdates.mrr = updates.mrr;
      if (updates.total_revenue !== undefined) dbUpdates.total_revenue = updates.total_revenue;
      if (updates.health_score !== undefined) dbUpdates.health_score = updates.health_score;
      if (updates.credits_balance !== undefined) dbUpdates.credits_balance = updates.credits_balance;

      const { error } = await supabase
        .from("profiles")
        .update(dbUpdates)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });
}

export function useUploadAvatar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlWithCacheBust })
        .eq("user_id", user.id);
      if (updateError) throw updateError;

      return urlWithCacheBust;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });
}
