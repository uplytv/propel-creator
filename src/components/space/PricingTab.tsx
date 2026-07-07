import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Loader2, Trash2, DollarSign, Tag, AlertTriangle, Check, Sparkles, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import EmptyState from "@/components/ui/EmptyState";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PurchaseOverlay } from "@/components/payments/PurchaseOverlay";
import { memberAuthUrl } from "@/lib/memberAuth";

interface PricingTabProps {
  creatorId: string;
}

const MAX_TIERS = 5;

export function PricingTab({ creatorId }: PricingTabProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOwner = user?.id === creatorId;

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [priceYearly, setPriceYearly] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [purchaseOverlayTier, setPurchaseOverlayTier] = useState<any>(null);
  const [overlayInterval, setOverlayInterval] = useState<"month" | "year">("month");
  // Member-side billing period toggle (shown when any tier offers annual)
  const [billing, setBilling] = useState<"month" | "year">("month");
  // Owner-side inline editor for annual price + welcome message on existing tiers
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editYearly, setEditYearly] = useState("");
  const [editWelcome, setEditWelcome] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

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

  const { data: space } = useQuery({
    queryKey: ["creator-space-pricing", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_spaces")
        .select("is_free, price")
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

  // Check if visitor already has an active subscription
  const { data: activeSub } = useQuery({
    queryKey: ["member-subscription", creatorId, user?.id],
    enabled: !!creatorId && !!user?.id && !isOwner,
    queryFn: async () => {
      const { data } = await supabase
        .from("member_subscriptions")
        .select("*, subscription_tiers(name, price_monthly)")
        .eq("creator_id", creatorId)
        .eq("member_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
  });

  // Check active subscriber counts per tier (owner only)
  const tierIds = (tiers || []).map((t: any) => t.id);
  const { data: subscriberCounts = {} } = useQuery({
    queryKey: ["tier-subscriber-counts", tierIds],
    enabled: tierIds.length > 0 && isOwner,
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

  // Tier-gated classroom content: rank -> lesson count, via SECURITY DEFINER
  // RPC (gated lesson rows are invisible to under-tier members, so a plain
  // select would undercount). Used for the per-tier "Unlocks N gated lessons"
  // hint.
  const { data: gatedCounts = [] } = useQuery({
    queryKey: ["tier-gated-lesson-counts", creatorId],
    enabled: !!creatorId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("tier_gated_lesson_counts", { p_creator_id: creatorId });
      if (error) return [] as { min_rank: number; lesson_count: number }[];
      return (data || []) as { min_rank: number; lesson_count: number }[];
    },
  });

  // A tier unlocks every lesson gated at or below its rank. tier_rank is a new
  // column (backfilled from price ordering); fall back to list position for
  // tiers created before types/backfill catch up.
  const gatedLessonsUnlockedBy = (tier: any, idx: number) => {
    const rank = tier.tier_rank ?? idx + 1;
    return (gatedCounts as any[]).reduce(
      (sum, row) => (Number(row.min_rank) <= rank ? sum + Number(row.lesson_count) : sum),
      0,
    );
  };

  const handleCreate = async () => {
    if (!name || !price) return;
    if ((tiers?.length || 0) >= MAX_TIERS) {
      toast.error("Limit reached", { description: `You can create up to ${MAX_TIERS} tiers` });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-tier", {
        body: {
          name,
          description,
          price_monthly: parseFloat(price),
          price_yearly: priceYearly ? parseFloat(priceYearly) : undefined,
          welcome_message: welcomeMessage.trim() ? welcomeMessage.trim().slice(0, 1000) : undefined,
        },
      });
      if (error) throw error;
      toast.success("Tier created", { description: `${name} is now live` });
      queryClient.invalidateQueries({ queryKey: ["subscription-tiers"] });
      setShowForm(false);
      setName("");
      setDescription("");
      setPrice("");
      setPriceYearly("");
      setWelcomeMessage("");
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
    setCreating(false);
  };

  // Owner: update annual price / welcome message on an existing tier.
  // Direct table update under "Creators manage own tiers" RLS; the yearly
  // Stripe price is created lazily by stripe-create-checkout on first annual
  // checkout, so no edge-function round trip is needed here.
  const handleSaveTierExtras = async (tierId: string) => {
    setSavingEdit(true);
    try {
      const yearly = editYearly ? parseFloat(editYearly) : null;
      if (yearly !== null && (!isFinite(yearly) || yearly <= 0)) {
        throw new Error("Annual price must be a positive number");
      }
      const { error } = await supabase
        .from("subscription_tiers")
        .update({
          price_yearly: yearly,
          // Clear the cached yearly Stripe price so checkout recreates it at the new amount
          stripe_price_id_yearly: null,
          welcome_message: editWelcome.trim() ? editWelcome.trim().slice(0, 1000) : null,
        })
        .eq("id", tierId);
      if (error) throw error;
      toast.success("Tier updated");
      queryClient.invalidateQueries({ queryKey: ["subscription-tiers"] });
      setEditingTierId(null);
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
    setSavingEdit(false);
  };

  const annualSavingsPct = (tier: any) => {
    const monthly = Number(tier.price_monthly) || 0;
    const yearly = Number((tier as any).price_yearly) || 0;
    if (monthly <= 0 || yearly <= 0) return 0;
    return Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100));
  };

  const handleDeactivate = async (tierId: string, tierName: string) => {
    const { error } = await supabase
      .from("subscription_tiers")
      .update({ is_active: false })
      .eq("id", tierId);
    if (error) {
      toast.error("Error", { description: error.message });
    } else {
      toast.success("Tier deactivated", { description: `${tierName} has been deactivated` });
      queryClient.invalidateQueries({ queryKey: ["subscription-tiers"] });
    }
  };

  const handleSubscribe = async (tierId: string) => {
    if (!user) {
      // Account required before checkout — free member signup, then return.
      navigate(memberAuthUrl());
      return;
    }
    const tier = tiers?.find((t: any) => t.id === tierId);
    // Annual only applies when toggled on AND this tier offers a yearly price
    const interval: "month" | "year" =
      billing === "year" && Number((tier as any)?.price_yearly) > 0 ? "year" : "month";
    if (tier) {
      setOverlayInterval(interval);
      setPurchaseOverlayTier(tier);
    } else {
      // Fallback to redirect
      setSelectedTier(tierId);
      setCheckoutLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("stripe-create-checkout", {
          body: { tier_id: tierId, creator_id: creatorId, interval },
        });
        if (error) throw error;
        if (data?.url) window.location.href = data.url;
      } catch (err: any) {
        toast.error("Error", { description: err.message });
      }
      setCheckoutLoading(false);
      setSelectedTier(null);
    }
  };

  const hasAnnual = (tiers || []).some((t: any) => Number(t.price_yearly) > 0);

  const requiresPaidJoin = (tiers?.length || 0) > 0 || space?.is_free === false || Number(space?.price || 0) > 0;

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  // ── VISITOR / MEMBER VIEW ──
  if (!isOwner) {
    if (!tiers || tiers.length === 0) {
      return (
        <div className="p-8 text-center">
          <EmptyState
            icon={DollarSign}
            title={requiresPaidJoin ? "Plans coming soon" : "Free community"}
            description={requiresPaidJoin ? "This creator has marked the space as paid, but no live Stripe tier is published yet." : "This community is free to join. No paid tiers available."}
          />
        </div>
      );
    }

    return (
      <div className="px-4 pt-4 space-y-4">
        {/* Active subscription badge */}
        {activeSub && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                You're on the {(activeSub as any).subscription_tiers?.name || "Active"} plan
              </p>
              <p className="text-xs text-muted-foreground">
                ${(activeSub as any).subscription_tiers?.price_monthly || "—"}/mo • Manage in Settings → Subscriptions
              </p>
            </div>
            <Check className="w-5 h-5 text-primary" />
          </motion.div>
        )}

        <div className="text-center pb-2">
          <h3 className="text-lg font-bold text-foreground">Choose Your Plan</h3>
          <p className="text-xs text-muted-foreground mt-1">Unlock exclusive content, courses, and community access</p>
        </div>

        {/* Monthly / Annual toggle — only when at least one tier offers annual */}
        {hasAnnual && (
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-0.5">
              <button
                onClick={() => setBilling("month")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  billing === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("year")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  billing === "year" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Annual
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {tiers.map((tier: any, idx: number) => {
            const isCurrentPlan = activeSub?.tier_id === tier.id;
            const isPopular = idx === Math.min(1, tiers.length - 1) && tiers.length > 1;
            const tierHasAnnual = Number(tier.price_yearly) > 0;
            const showAnnual = billing === "year" && tierHasAnnual;
            const savePct = annualSavingsPct(tier);
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`relative rounded-xl border-2 p-5 transition-all ${
                  isCurrentPlan
                    ? "border-primary bg-primary/5"
                    : isPopular
                    ? "border-primary/50 bg-card"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                {isPopular && !isCurrentPlan && (
                  <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> POPULAR
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> YOUR PLAN
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-foreground">{tier.name}</h4>
                    {tier.description && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">{tier.description}</p>
                    )}
                    {gatedLessonsUnlockedBy(tier, idx) > 0 && (
                      <p className="text-[11px] font-medium text-primary mt-1.5 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Unlocks {gatedLessonsUnlockedBy(tier, idx)} tier-gated lesson{gatedLessonsUnlockedBy(tier, idx) !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {showAnnual ? (
                      <>
                        <span className="text-2xl font-bold text-primary">${tier.price_yearly}</span>
                        <span className="text-xs text-muted-foreground">/yr</span>
                        {savePct > 0 && (
                          <div className="mt-1 inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                            Save {savePct}%
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-primary">${tier.price_monthly}</span>
                        <span className="text-xs text-muted-foreground">/mo</span>
                        {billing === "year" && !tierHasAnnual && (
                          <p className="text-[10px] text-muted-foreground mt-1">Monthly only</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  {isCurrentPlan ? (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      <Check className="w-4 h-4 mr-1.5" /> Current Plan
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={() => handleSubscribe(tier.id)}
                      disabled={checkoutLoading && selectedTier === tier.id}
                    >
                      {checkoutLoading && selectedTier === tier.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {activeSub ? "Upgrade" : "Subscribe"}
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        <p className="text-[10px] text-center text-muted-foreground pt-1">
          Cancel anytime. Secure payments via Stripe.
        </p>

        {purchaseOverlayTier && (
          <PurchaseOverlay
            isOpen={!!purchaseOverlayTier}
            onClose={() => setPurchaseOverlayTier(null)}
            onSuccess={() => {
              setPurchaseOverlayTier(null);
              queryClient.invalidateQueries({ queryKey: ["subscription-tiers"] });
              queryClient.invalidateQueries({ queryKey: ["member-subscription"] });
              toast.success("Welcome to the community! 🎉");
            }}
            purchaseType="subscription"
            purchaseParams={{ tier_id: purchaseOverlayTier.id, creator_id: creatorId, interval: overlayInterval }}
            title={`Subscribe to ${purchaseOverlayTier.name}${overlayInterval === "year" ? " (Annual)" : ""}`}
            description={purchaseOverlayTier.description || undefined}
            price={overlayInterval === "year" ? (purchaseOverlayTier as any).price_yearly : purchaseOverlayTier.price_monthly}
          />
        )}
      </div>
    );
  }

  // ── OWNER VIEW ──
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
      {tiers && tiers.length > 0 ? (
        <div className="space-y-3">
          {tiers.map((tier: any, idx: number) => {
            const subCount = subscriberCounts[tier.id] || 0;
            const hasSubscribers = subCount > 0;
            const gatedN = gatedLessonsUnlockedBy(tier, idx);
            const isEditing = editingTierId === tier.id;
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
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
                    {gatedN > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">Unlocks {gatedN} gated lesson{gatedN !== 1 ? "s" : ""}</p>
                    )}
                    {tier.welcome_message && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">Welcome message set</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-sm font-bold text-primary">${tier.price_monthly}/mo</span>
                    {Number(tier.price_yearly) > 0 && (
                      <p className="text-[10px] text-muted-foreground">${tier.price_yearly}/yr</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => {
                      if (isEditing) {
                        setEditingTierId(null);
                      } else {
                        setEditingTierId(tier.id);
                        setEditYearly(Number(tier.price_yearly) > 0 ? String(tier.price_yearly) : "");
                        setEditWelcome(tier.welcome_message || "");
                      }
                    }}
                  >
                    {isEditing ? "Close" : "Edit"}
                  </Button>
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
                </div>

                {/* Inline editor: annual price + welcome message */}
                {isEditing && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">$</span>
                      <input
                        value={editYearly}
                        onChange={(e) => setEditYearly(e.target.value.replace(/[^0-9.]/g, ""))}
                        placeholder="Annual price (optional)"
                        className="w-40 rounded-lg bg-secondary/40 border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <span className="text-sm text-muted-foreground">/year</span>
                    </div>
                    {Number(tier.price_monthly) > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Tip: 2 months free would be ${(Number(tier.price_monthly) * 10).toFixed(2)}/yr
                      </p>
                    )}
                    <textarea
                      value={editWelcome}
                      onChange={(e) => setEditWelcome(e.target.value.slice(0, 1000))}
                      placeholder="Welcome message — sent to new members when they join (optional)"
                      rows={3}
                      maxLength={1000}
                      className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground">{editWelcome.length}/1000</p>
                      <Button size="sm" onClick={() => handleSaveTierExtras(tier.id)} disabled={savingEdit} className="gap-1.5">
                        {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        Save
                      </Button>
                    </div>
                  </div>
                )}
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <input
                  value={priceYearly}
                  onChange={(e) => setPriceYearly(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="Annual price (optional)"
                  className="w-44 rounded-lg bg-secondary/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <span className="text-sm text-muted-foreground">/year</span>
              </div>
              {parseFloat(price) > 0 && (
                <p className="text-[11px] text-muted-foreground -mt-1">
                  Tip: 2 months free would be ${(parseFloat(price) * 10).toFixed(2)}/yr
                </p>
              )}
              <textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value.slice(0, 1000))}
                placeholder="Welcome message — sent to new members when they join (optional)"
                rows={3}
                maxLength={1000}
                className="w-full rounded-lg bg-secondary/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
              {welcomeMessage.length > 0 && (
                <p className="text-[10px] text-muted-foreground -mt-1">{welcomeMessage.length}/1000</p>
              )}
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
