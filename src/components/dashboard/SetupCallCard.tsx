import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SETUP_CALL_URL } from "@/components/pricing/plans";
import { trackEvent } from "@/lib/posthog";

const DISMISS_KEY = "uply_setup_call_card_dismissed";

/**
 * Persistent "book your free setup call" offer — the same offer shown once in
 * the trial-success modal, kept visible on the Dashboard for creators with an
 * active/trialing platform subscription until dismissed or clicked
 * (localStorage). Square tokens, primary-tinted, same copy family as the
 * modal offer.
 */
export default function SetupCallCard() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Same queryKey as PlatformUpgradeBanner — react-query dedupes the edge call.
  const { data: planData } = useQuery({
    queryKey: ["platform-subscription", user?.id],
    enabled: !!user && !dismissed,
    queryFn: async () => {
      try {
        const { data } = await supabase.functions.invoke("check-platform-subscription");
        return data;
      } catch {
        return { plan: "free" };
      }
    },
  });

  // check-platform-subscription counts only active/trialing subs as subscribed.
  if (dismissed || !planData?.subscribed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* noop */
    }
  };

  return (
    <div className="relative rounded-md border border-primary/40 bg-primary/5 p-4">
      <button
        type="button"
        aria-label="Dismiss setup call offer"
        onClick={dismiss}
        className="absolute right-2 top-2 p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary/15">
          <CalendarCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Book your free setup call</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            We&apos;ll build your website funnel, SEO blog post, and community &amp; course
            setup with you — a real human rep, free with your plan.
          </p>
        </div>
      </div>
      <Button
        className="mt-3 w-full rounded-sm font-bold"
        onClick={() => {
          trackEvent("setup_call_card_clicked", { source: "dashboard" });
          window.open(SETUP_CALL_URL, "_blank", "noopener,noreferrer");
          dismiss();
        }}
      >
        Book my setup call
      </Button>
    </div>
  );
}
