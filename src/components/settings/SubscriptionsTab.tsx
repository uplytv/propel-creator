import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { CreditCard, ExternalLink, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/hooks/use-toast";

export function SubscriptionsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);

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
      
      // Fetch creator profiles separately
      const creatorIds = [...new Set((data || []).map((s: any) => s.creator_id))];
      const { data: profiles } = await supabase
        .from("profiles" as any)
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", creatorIds);
      
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
      
      return (data || []).map((s: any) => ({
        ...s,
        creator_profile: profileMap[s.creator_id] || null,
      }));
    },
  });

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setPortalLoading(false);
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

  const statusColors: Record<string, string> = {
    active: "bg-primary/10 text-primary",
    canceled: "bg-destructive/10 text-destructive",
    past_due: "bg-yellow-500/10 text-yellow-500",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {subscriptions.map((sub: any) => {
        const tier = sub.subscription_tiers;
        const creator = sub.creator_profile;
        return (
          <div key={sub.id} className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {creator?.avatar_url ? (
                <img src={creator.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {(creator?.display_name || "C").charAt(0)}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold">{creator?.display_name || "Creator"}</p>
                <p className="text-xs text-muted-foreground">
                  {tier?.name || "Subscription"} · ${tier?.price_monthly || 0}/mo
                </p>
                {sub.current_period_end && (
                  <p className="text-[10px] text-muted-foreground">
                    {sub.status === "active" ? "Renews" : "Expires"} {new Date(sub.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <Badge variant="outline" className={`border-0 text-[10px] font-bold capitalize ${statusColors[sub.status] || "bg-muted text-muted-foreground"}`}>
              {sub.status === "past_due" ? "Past Due" : sub.status}
            </Badge>
          </div>
        );
      })}

      <Button variant="outline" onClick={handleManage} disabled={portalLoading} className="w-full gap-2">
        {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
        Manage Subscriptions
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">
        Update payment methods, cancel, or view invoices via the billing portal.
      </p>
    </motion.div>
  );
}
