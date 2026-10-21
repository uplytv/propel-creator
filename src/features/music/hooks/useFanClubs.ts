import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFanClubs(artistId?: string) {
  return useQuery({
    queryKey: ["music-fan-clubs", artistId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("music_fan_clubs").select("*").eq("is_active", true);
      if (artistId) q = q.eq("artist_id", artistId);
      const { data, error } = await q.order("member_count", { ascending: false }).limit(40);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFanClub(clubId?: string) {
  return useQuery({
    queryKey: ["music-fan-club", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_fan_clubs")
        .select("*")
        .eq("id", clubId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyFanClubMembership(clubId?: string) {
  return useQuery({
    queryKey: ["music-fan-club-membership", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("music_fan_club_memberships")
        .select("*")
        .eq("club_id", clubId!)
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyFanClubMemberships() {
  return useQuery({
    queryKey: ["my-music-fan-club-memberships"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("music_fan_club_memberships")
        .select("*, music_fan_clubs(*)")
        .eq("user_id", auth.user.id)
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFanClubDrops(clubId?: string) {
  return useQuery({
    queryKey: ["music-fan-club-drops", clubId],
    enabled: !!clubId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("music_fan_club_drops")
        .select("*")
        .eq("club_id", clubId!)
        .order("drops_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyFanClubBadges(clubId?: string) {
  return useQuery({
    queryKey: ["music-fan-club-badges", clubId ?? "all"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      let q = supabase.from("music_fan_club_badges").select("*").eq("user_id", auth.user.id);
      if (clubId) q = q.eq("club_id", clubId);
      const { data, error } = await q.order("awarded_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Paid fan clubs go through Stripe Checkout (create-fan-club-checkout). The
// subscription row is written by stripe-webhook, never by the client.
async function startFanClubCheckout(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("create-fan-club-checkout", {
    body: { ...body, return_path: window.location.pathname },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (data?.url) {
    window.location.assign(data.url);
    return { redirected: true as const };
  }
  return { redirected: false as const, ...data };
}

export function useJoinFanClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { club_id: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      return startFanClubCheckout({ club_id: input.club_id });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["music-fan-club-membership", v.club_id] });
      qc.invalidateQueries({ queryKey: ["my-music-fan-club-memberships"] });
    },
  });
}

export function useCancelFanClubMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clubId: string) => {
      // Cancels at period end in Stripe; the webhook updates the row.
      await startFanClubCheckout({ action: "cancel", club_id: clubId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-music-fan-club-memberships"] });
    },
  });
}
