import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TRIAL_INTENT_STORAGE_KEY, CREATOR_PRICING_CHECKOUT_ENABLED } from "@/components/pricing/plans";
import { withTrialTimeout, hostedCheckoutUrl } from "@/lib/trialCheckout";

/**
 * Resumes a 14-day-trial signup that was interrupted by account creation.
 * The pricing modal stashes {plan, company, full_name, email, phone} in
 * localStorage before routing logged-out visitors to /auth. The moment an
 * authenticated session exists, this relaunches Stripe checkout with the
 * saved intent so signup never drops the trial. Renders nothing.
 */
export default function TrialIntentResume() {
  const { user } = useAuth();
  const fired = useRef(false);

  useEffect(() => {
    if (!user || fired.current) return;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(TRIAL_INTENT_STORAGE_KEY);
    } catch {
      return; // localStorage unavailable
    }
    if (!raw) return;

    let intent: { plan?: string; company?: string; full_name?: string; phone?: string; billing_interval?: string } = {};
    try {
      intent = JSON.parse(raw);
    } catch {
      localStorage.removeItem(TRIAL_INTENT_STORAGE_KEY);
      return;
    }
    if (!CREATOR_PRICING_CHECKOUT_ENABLED && ["free", "pro", "studio"].includes(intent.plan ?? "")) return;
    if (!intent.plan) {
      localStorage.removeItem(TRIAL_INTENT_STORAGE_KEY);
      return;
    }

    // One attempt per page load; guard against error->remount retry loops.
    fired.current = true;
    if (sessionStorage.getItem("uply_trial_resume_attempted")) return;
    sessionStorage.setItem("uply_trial_resume_attempted", "1");

    (async () => {
      toast.loading("Resuming your free trial…", { id: "trial-resume" });
      try {
        const { data, error } = await withTrialTimeout(supabase.functions.invoke("create-platform-checkout", {
          body: {
            plan: intent.plan,
            billing_interval: intent.billing_interval ?? "monthly",
            trial: true,
            company: intent.company,
            full_name: intent.full_name,
            phone: intent.phone,
          },
        }), "Checkout is taking too long. Please try again from Pricing.");
        if (error || !data?.url) throw error || new Error("No checkout URL returned");
        localStorage.removeItem(TRIAL_INTENT_STORAGE_KEY);
        toast.dismiss("trial-resume");
        window.location.href = hostedCheckoutUrl(data.url);
      } catch {
        toast.dismiss("trial-resume");
        toast.error("Couldn't resume your free trial", {
          description: "Head to Pricing to start it , your 14 free days are still waiting.",
        });
        // Leave the intent stored so a later visit (or /pricing) can pick it up.
      }
    })();
  }, [user]);

  return null;
}
