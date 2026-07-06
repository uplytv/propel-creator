import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Opens the existing Stripe billing portal (edge fn `stripe-create-portal`,
 * which resolves the Stripe customer by the auth user's email). Reused for
 * both creator memberships and the UPLY platform plan.
 */
export function useBillingPortal() {
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = async () => {
    if (portalLoading) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-portal");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("No billing portal URL returned");
      window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error("Couldn't open billing portal", {
        description: err?.message || "Please try again in a moment.",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  return { openPortal, portalLoading };
}
