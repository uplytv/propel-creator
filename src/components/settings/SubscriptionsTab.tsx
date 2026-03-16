import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { CreditCard, ExternalLink, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
          subscription_tiers(name, price_monthly),
          profiles:creator_id(display_name, avatar_url, username)
        `)
        .eq("member_id", user!.id)
        .eq("status", "active");
      return data || [];
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
        icon={<Users className="w-8 h-8" />}
        title="No active subscriptions"
        description="When you subscribe to a creator's community, it will appear here."
      />
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {subscriptions.map((sub: any) => {
        const tier = sub.subscription_tiers;
        const creator = sub.profiles;
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
                    Renews {new Date(sub.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">Active</span>
          </div>
        );
      })}

      <Button variant="outline" onClick={handleManage} disabled={portalLoading} className="w-full gap-2">
        {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
        Manage Subscriptions
      </Button>
    </motion.div>
  );
}
