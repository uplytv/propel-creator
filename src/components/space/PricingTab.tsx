import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Loader2, Trash2, DollarSign, Tag, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import EmptyState from "@/components/ui/EmptyState";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface PricingTabProps {
  creatorId: string;
}

const MAX_TIERS = 5;

export function PricingTab({ creatorId }: PricingTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isOwner = user?.id === creatorId;

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: stripeAccount } = useQuery({
    queryKey: ["stripe-account", creatorId],
    enabled: !!creatorId && isOwner,
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_stripe_accounts")
        .select("*")
        .eq("creator_id", creatorId)
        .maybeSingle();
      return data;
    },
  });

  const { data: tiers, isLoading } = useQuery({
    queryKey: ["subscription-tiers", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_tiers")
        .select("*")
        .eq("creator_id", creatorId)
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });
      return data || [];
    },
  });

  // Check active subscriber counts per tier
  const tierIds = (tiers || []).map((t: any) => t.id);
  const { data: subscriberCounts = {} } = useQuery({
    queryKey: ["tier-subscriber-counts", tierIds],
    enabled: tierIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("member_subscriptions")
        .select("tier_id")
        .in("tier_id", tierIds)
        .eq("status", "active");
      const counts: Record<string, number> = {};
      (data || []).forEach((s: any) => {
        counts[s.tier_id] = (counts[s.tier_id] || 0) + 1;
      });
      return counts;
    },
  });

  const handleCreate = async () => {
    if (!name || !price) return;
    if ((tiers?.length || 0) >= MAX_TIERS) {
      toast({ title: "Limit reached", description: `You can create up to ${MAX_TIERS} tiers.`, variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-tier", {
        body: { name, description, price_monthly: parseFloat(price) },
      });
      if (error) throw error;
      toast({ title: "Tier created", description: `${name} is now live.` });
      queryClient.invalidateQueries({ queryKey: ["subscription-tiers"] });
      setShowForm(false);
      setName("");
      setDescription("");
      setPrice("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleDeactivate = async (tierId: string, tierName: string) => {
    const subCount = subscriberCounts[tierId] || 0;
    const { error } = await supabase
      .from("subscription_tiers")
      .update({ is_active: false })
      .eq("id", tierId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tier deactivated", description: `${tierName} has been hidden from new members.` });
      queryClient.invalidateQueries({ queryKey: ["subscription-tiers"] });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  if (!isOwner) return null;

  if (!stripeAccount?.charges_enabled) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground mb-2">Connect Stripe first to create subscription tiers.</p>
        <p className="text-xs text-muted-foreground">Go to Dashboard → Payouts to set up Stripe.</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 space-y-4">
      {/* Existing tiers */}
      {tiers && tiers.length > 0 ? (
        <div className="space-y-3">
          {tiers.map((tier: any) => {
            const subCount = subscriberCounts[tier.id] || 0;
            const hasSubscribers = subCount > 0;
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Tag className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">{tier.name}</h4>
                    {tier.description && <p className="text-xs text-muted-foreground line-clamp-1">{tier.description}</p>}
                    {hasSubscribers && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{subCount} active subscriber{subCount !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">${tier.price_monthly}/mo</span>
                  {hasSubscribers ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-500" /> Active Subscribers
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This tier has {subCount} active subscriber{subCount !== 1 ? "s" : ""}. Deactivating it will hide it from new members, but existing subscribers will keep access until they cancel.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeactivate(tier.id, tier.name)}>
                            Deactivate Anyway
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => handleDeactivate(tier.id, tier.name)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={DollarSign}
          title="No subscription tiers yet"
          description="Create your first tier to start accepting recurring payments from members."
        />
      )}

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-4 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tier name (e.g. Pro, VIP)"
                className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What members get (optional)"
                rows={2}
                className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="9.99"
                  className="w-28 rounded-lg bg-secondary/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleCreate} disabled={creating || !name || !price} size="sm" className="gap-1.5">
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Create Tier
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showForm && (tiers?.length || 0) < MAX_TIERS && (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full gap-2">
          <Plus className="w-4 h-4" /> Add Tier {tiers?.length ? `(${tiers.length}/${MAX_TIERS})` : ""}
        </Button>
      )}
      {(tiers?.length || 0) >= MAX_TIERS && !showForm && (
        <p className="text-xs text-muted-foreground text-center">Maximum of {MAX_TIERS} tiers reached.</p>
      )}
    </div>
  );
}
