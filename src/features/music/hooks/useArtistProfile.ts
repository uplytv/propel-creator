import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface ArtistProfile {
  id: string;
  user_id: string;
  is_verified: boolean;
  header_image_url: string | null;
  artist_bio: string | null;
  monthly_listeners_cache: number;
  social_links: Record<string, string>;
}

export function useArtistProfile(userId?: string) {
  return useQuery({
    queryKey: ["artist-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("artist_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return (data as ArtistProfile | null) ?? null;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useUpsertArtistProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ArtistProfile>) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("artist_profiles")
        .upsert({ user_id: user.id, ...payload }, { onConflict: "user_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["artist-profile", user?.id] });
    },
  });
}
