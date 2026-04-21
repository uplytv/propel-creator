import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type BoostTier = "starter" | "growth" | "pro";

export const BOOST_TIERS: Record<BoostTier, { price: number; days: number; label: string; description: string }> = {
  starter: { price: 10, days: 1, label: "Starter", description: "24-hour promoted slot in the Discover feed" },
  growth: { price: 25, days: 3, label: "Growth", description: "3 days promoted in Discover + category feeds" },
  pro: { price: 50, days: 7, label: "Pro", description: "7 days promoted everywhere + top-of-feed priority" },
};

export function useActiveBoosts(contentType?: string) {
  return useQuery({
    queryKey: ["active-boosts", contentType],
    queryFn: async () => {
      let q = supabase
        .from("content_boosts")
        .select("*")
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString());
      if (contentType) q = q.eq("content_type", contentType);
      const { data } = await q;
      return data || [];
    },
    staleTime: 60_000,
  });
}

export function useMyBoosts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-boosts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("content_boosts")
        .select("*")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });
}

export function useStartBoostCheckout() {
  return useMutation({
    mutationFn: async (params: { content_id: string; content_type: string; tier: BoostTier }) => {
      const { data, error } = await supabase.functions.invoke("create-boost-checkout", { body: params });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL");
      window.open(data.url, "_blank");
      return data;
    },
  });
}

export function useVerifyBoostPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (session_id: string) => {
      const { data, error } = await supabase.functions.invoke("verify-boost-payment", { body: { session_id } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-boosts"] });
      qc.invalidateQueries({ queryKey: ["active-boosts"] });
    },
  });
}
