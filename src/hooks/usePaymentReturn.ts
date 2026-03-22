import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to handle mobile return from Stripe checkout.
 * Checks URL params and sessionStorage for pending purchase/join status.
 * Polls the database until the webhook has processed.
 */
export function usePaymentReturn(creatorId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);

  const pollForPurchase = useCallback(async (productId: string): Promise<boolean> => {
    for (let i = 0; i < 15; i++) {
      const { data } = await supabase
        .from("product_purchases")
        .select("id")
        .eq("product_id", productId)
        .eq("buyer_id", user!.id)
        .maybeSingle();
      if (data) return true;
      await new Promise(r => setTimeout(r, 2000));
    }
    return false;
  }, [user]);

  const pollForSubscription = useCallback(async (cId: string): Promise<boolean> => {
    for (let i = 0; i < 15; i++) {
      const { data } = await supabase
        .from("member_subscriptions")
        .select("id")
        .eq("member_id", user!.id)
        .eq("creator_id", cId)
        .eq("status", "active")
        .maybeSingle();
      if (data) return true;
      await new Promise(r => setTimeout(r, 2000));
    }
    return false;
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const enrolled = params.get("enrolled");
    const productId = params.get("product_id");
    const joined = params.get("joined");
    const joinCreatorId = params.get("creator_id") || creatorId;
    const accessGranted = params.get("access_granted");
    const resourceId = params.get("resource_id");

    // Also check sessionStorage
    const pendingPurchase = sessionStorage.getItem("uply_pending_purchase");
    const pendingJoin = sessionStorage.getItem("uply_pending_join");

    const handleReturn = async () => {
      setChecking(true);

      // Generic access_granted handler (from PaywallModal)
      if (accessGranted === "true" && resourceId) {
        sessionStorage.removeItem("uply_pending_access");
        // Poll access_grants for up to 45 seconds
        let found = false;
        for (let i = 0; i < 15; i++) {
          const { data } = await supabase
            .from("access_grants")
            .select("id")
            .eq("user_id", user!.id)
            .eq("resource_id", resourceId)
            .is("revoked_at", null)
            .maybeSingle();
          if (data) { found = true; break; }
          await new Promise(r => setTimeout(r, 3000));
        }
        if (found) {
          toast({ title: "Access granted! 🎉" });
          queryClient.invalidateQueries({ queryKey: ["access"] });
        } else {
          toast({ title: "Payment received", description: "Access is being activated. Refresh in a moment." });
        }
        const url = new URL(window.location.href);
        url.searchParams.delete("access_granted");
        url.searchParams.delete("resource_id");
        window.history.replaceState({}, "", url.toString());
      }

      if (enrolled === "true" && productId) {
        sessionStorage.removeItem("uply_pending_purchase");
        const found = await pollForPurchase(productId);
        if (found) {
          toast({ title: "You're enrolled! 🎉", description: "Start learning →" });
          queryClient.invalidateQueries({ queryKey: ["product-purchase"] });
          queryClient.invalidateQueries({ queryKey: ["access"] });
        } else {
          toast({ title: "Your payment was received", description: "Access is being activated. Refresh in a moment." });
        }
        const url = new URL(window.location.href);
        url.searchParams.delete("enrolled");
        url.searchParams.delete("product_id");
        window.history.replaceState({}, "", url.toString());
      }

      if (joined === "true" && joinCreatorId) {
        sessionStorage.removeItem("uply_pending_join");
        const found = await pollForSubscription(joinCreatorId);
        if (found) {
          toast({ title: "Welcome! 🎉", description: "You now have full access." });
          queryClient.invalidateQueries({ queryKey: ["is-member"] });
          queryClient.invalidateQueries({ queryKey: ["member-subscription"] });
          queryClient.invalidateQueries({ queryKey: ["access"] });
        } else {
          toast({ title: "Your payment was received", description: "Access is being activated. Refresh in a moment." });
        }
        const url = new URL(window.location.href);
        url.searchParams.delete("joined");
        url.searchParams.delete("creator_id");
        window.history.replaceState({}, "", url.toString());
      }

      // Handle sessionStorage fallback (if URL params were lost)
      if (!enrolled && !joined && !accessGranted && pendingPurchase) {
        try {
          const { product_id } = JSON.parse(pendingPurchase);
          sessionStorage.removeItem("uply_pending_purchase");
          const found = await pollForPurchase(product_id);
          if (found) {
            toast({ title: "You're enrolled! 🎉" });
            queryClient.invalidateQueries({ queryKey: ["product-purchase"] });
            queryClient.invalidateQueries({ queryKey: ["access"] });
          }
        } catch {}
      }

      if (!enrolled && !joined && !accessGranted && pendingJoin) {
        try {
          const { creator_id } = JSON.parse(pendingJoin);
          sessionStorage.removeItem("uply_pending_join");
          const found = await pollForSubscription(creator_id);
          if (found) {
            toast({ title: "Welcome! 🎉" });
            queryClient.invalidateQueries({ queryKey: ["is-member"] });
            queryClient.invalidateQueries({ queryKey: ["member-subscription"] });
            queryClient.invalidateQueries({ queryKey: ["access"] });
          }
        } catch {}
      }

      // Handle pending access from PaywallModal
      const pendingAccess = sessionStorage.getItem("uply_pending_access");
      if (!accessGranted && !enrolled && !joined && pendingAccess) {
        try {
          const { resource_id } = JSON.parse(pendingAccess);
          sessionStorage.removeItem("uply_pending_access");
          let found = false;
          for (let i = 0; i < 15; i++) {
            const { data } = await supabase
              .from("access_grants")
              .select("id")
              .eq("user_id", user!.id)
              .eq("resource_id", resource_id)
              .is("revoked_at", null)
              .maybeSingle();
            if (data) { found = true; break; }
            await new Promise(r => setTimeout(r, 3000));
          }
          if (found) {
            toast({ title: "Access granted! 🎉" });
            queryClient.invalidateQueries({ queryKey: ["access"] });
          }
        } catch {}
      }

      setChecking(false);
    };

    handleReturn();
  }, [user]); // Only run once on mount

  return { checking };
}

/**
 * Hook to check if a product has been purchased by the current user.
 */
export function useProductPurchaseCheck(productId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["product-purchase-check", productId, user?.id],
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

/**
 * Hook to check member subscription status.
 */
export function useMemberSubscriptionStatus(creatorId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["member-sub-status", creatorId, user?.id],
    enabled: !!creatorId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("member_subscriptions")
        .select("id, status, tier_id, stripe_customer_id, current_period_end, subscription_tiers(name, price_monthly)")
        .eq("member_id", user!.id)
        .eq("creator_id", creatorId!)
        .maybeSingle();
      return data;
    },
  });
}
