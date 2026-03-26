import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useStripeAccount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["stripe-account", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_stripe_accounts")
        .select("*")
        .eq("creator_id", user!.id)
        .maybeSingle();
      return data;
    },
  });
}

export function useSubscriptionTiers(creatorId: string | undefined) {
  return useQuery({
    queryKey: ["subscription-tiers", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_tiers")
        .select("*")
        .eq("creator_id", creatorId!)
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });
      return data || [];
    },
  });
}

export function useMemberSubscription(creatorId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["member-subscription", creatorId, user?.id],
    enabled: !!creatorId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("member_subscriptions")
        .select("*, subscription_tiers(name, price_monthly)")
        .eq("member_id", user!.id)
        .eq("creator_id", creatorId!)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
  });
}

export function useProductPurchase(productId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["product-purchase", productId, user?.id],
    enabled: !!productId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_purchases")
        .select("id")
        .eq("product_id", productId!)
        .eq("buyer_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });
}

export function useCreditPackages() {
  return useQuery({
    queryKey: ["credit-packages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_packages")
        .select("*")
        .order("price_usd", { ascending: true });
      return data || [];
    },
  });
}
