import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { PLATFORM_PLANS, planDisplayName } from "@/components/pricing/plans";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import QueryErrorState from "@/components/ui/QueryErrorState";
import { useBillingPortal } from "./useBillingPortal";

interface PlatformSub {
  subscribed: boolean;
  plan: string;
  subscription_end: string | null;
  is_trial?: boolean;
}

/** The buyer's UPLY platform plan (creators) — status via check-platform-subscription. */
export default function PlatformPlanSection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openPortal, portalLoading } = useBillingPortal();

  const { data: sub, isLoading, isError, refetch } = useQuery({
    queryKey: ["purchases-platform-plan", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<PlatformSub> => {
      const { data, error } = await supabase.functions.invoke("check-platform-subscription");
      if (error) throw error;
      return (data || { subscribed: false, plan: "free", subscription_end: null }) as PlatformSub;
    },
  });

  const plan = PLATFORM_PLANS.find((p) => p.key === sub?.plan);
  const isFree = !sub || sub.plan === "free" || (!sub.subscribed && !plan);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
        UPLY subscription
      </h2>

      {isLoading && <Skeleton className="h-24 w-full rounded-none" />}

      {isError && (
        <QueryErrorState title="Couldn't load your plan" onRetry={() => refetch()} />
      )}

      {!isLoading && !isError && isFree && (
        <div className="border border-surface-border bg-surface-raised">
          <EmptyState
            icon={CreditCard}
            title="Nothing here yet"
            description="You're on the free plan. Upgrade to unlock the full creator toolkit."
            actionLabel="View plans"
            onAction={() => navigate("/pricing")}
          />
        </div>
      )}

      {!isLoading && !isError && !isFree && (
        <div className="flex gap-3 p-3 border border-surface-border bg-surface-raised">
          <div className="w-12 h-12 flex-shrink-0 bg-secondary flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {planDisplayName(sub?.plan)}
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-primary/40 text-primary flex-shrink-0">
                {sub!.is_trial ? "Trial" : "Active"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {"See your billing portal for the actual amount and interval"}
              {sub!.subscription_end
                ? ` · ${sub!.is_trial ? "Trial ends" : "Renews"} ${format(
                    new Date(sub!.subscription_end),
                    "MMM d, yyyy",
                  )}`
                : ""}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={openPortal}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" />
                )}
                Manage billing
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => navigate("/pricing")}
              >
                Change plan
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
