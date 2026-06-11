import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { ExternalLink, Loader2, Users, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/EmptyState";
import { toast } from "sonner";

export function SubscriptionsTab() {
  const { user } = useAuth();
  const [portalLoadingId, setPortalLoadingId] = useState<string | null>(null);

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["my-subscriptions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("member_subscriptions")
        .select(`
          *,
          subscription_tiers(name, price_monthly)
        `)
        .eq("member_id", user!.id)
        .in("status", ["active", "canceled", "past_due"]);

      const creatorIds = [...new Set((data || []).map((s: any) => s.creator_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", creatorIds);

      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));

      return (data || []).map((s: any) => ({
        ...s,
        creator_profile: profileMap[s.creator_id] || null,
      }));
    },
  });

  const handleManageSubscription = async (sub: any) => {
    if (!sub.stripe_customer_id) {
      toast.error("No billing info found");
      return;
    }
    setPortalLoadingId(sub.id);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-portal", {
        body: { customer_id: sub.stripe_customer_id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
    setPortalLoadingId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (!subscriptions?.length) {
    return (
      <EmptyState
        icon={Users}
        title="No subscriptions"
        description="When you subscribe to a creator's community, it will appear here."
      />
    );
  }

  const statusConfig: Record<string, { color: string; label: string }> = {
    active: { color: "bg-primary/10 text-primary", label: "Active" },
    canceled: { color: "bg-destructive/10 text-destructive", label: "Canceled" },
    past_due: { color: "bg-yellow-500/10 text-yellow-500", label: "Past Due" },
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {subscriptions.map((sub: any) => {
        const tier = sub.subscription_tiers;
        const creator = sub.creator_profile;
        const status = statusConfig[sub.status] || { color: "bg-muted text-muted-foreground", label: sub.status };
        const isManaging = portalLoadingId === sub.id;

        return (
          <div key={sub.id} className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {creator?.avatar_url ? (
                  <img src={creator.avatar_url} className="w-10 h-10 rounded-full object-cover" alt={`${creator.display_name || "Creator"} avatar`} loading="lazy" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {(creator?.display_name || "C").charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">{creator?.display_name || "Creator"}</p>
                  <p className="text-xs text-muted-foreground">
                    {tier?.name || "Subscription"} · ${tier?.price_monthly || 0}/mo
                  </p>
                  {sub.current_period_end && (
                    <p className="text-[10px] text-muted-foreground">
                      {sub.status === "active" ? "Renews" : "Expires"}{" "}
                      {new Date(sub.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className={`border-0 text-[10px] font-bold ${status.color}`}
              >
                {status.label}
              </Badge>
            </div>

            {/* Actions per subscription */}
            <div className="flex gap-2">
              {sub.status === "past_due" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleManageSubscription(sub)}
                  disabled={isManaging}
                  className="gap-1.5 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/10"
                >
                  {isManaging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  Update Payment
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleManageSubscription(sub)}
                disabled={isManaging}
                className="gap-1.5"
              >
                {isManaging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                Manage Subscription
              </Button>
            </div>
          </div>
        );
      })}

      <p className="text-[10px] text-muted-foreground text-center">
        Update payment methods, cancel, or view invoices via the billing portal.
      </p>
    </motion.div>
  );
}
