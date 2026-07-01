import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Zap, Crown, Rocket, Check, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import AppLayout from "@/components/layout/AppLayout";
import { useCreditPackages } from "@/hooks/useStripeAccount";
import { useWallet } from "@/hooks/useWallet";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const iconMap: Record<number, React.ElementType> = {
  0: Coins,
  1: Zap,
  2: Crown,
  3: Rocket,
};

const badgeMap: Record<number, string | null> = {
  0: null,
  1: "Best Value",
  2: "Save 33%",
  3: "Save 44%",
};

type PurchaseState = "idle" | "processing" | "success";

const BuyCredits = () => {
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [purchaseState, setPurchaseState] = useState<PurchaseState>("idle");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: packages = [], isLoading } = useCreditPackages();
  const { data: wallet, refetch: refetchWallet } = useWallet();

  // Handle Stripe redirect back
  useEffect(() => {
    if (searchParams.get("purchased") === "true") {
      toast.success("Payment successful!", {
        description: "Your credits are on the way — refreshing balance…",
      });
      // Webhook fulfills the credits; poll wallet briefly to catch it.
      let tries = 0;
      const poll = setInterval(async () => {
        tries += 1;
        await refetchWallet();
        queryClient.invalidateQueries({ queryKey: ["wallet-credits"] });
        if (tries >= 6) clearInterval(poll);
      }, 1500);
      searchParams.delete("purchased");
      searchParams.delete("session_id");
      setSearchParams(searchParams, { replace: true });
      return () => clearInterval(poll);
    }
    if (searchParams.get("canceled") === "true") {
      toast("Checkout canceled", { description: "No charge was made." });
      searchParams.delete("canceled");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, refetchWallet, queryClient]);

  const handlePurchase = async (pkg: any) => {
    setSelectedPkg(pkg.id);
    setPurchaseState("processing");

    try {
      const { data, error } = await supabase.functions.invoke("create-credits-checkout", {
        body: { package_id: pkg.id },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL returned");
      window.location.href = data.url;
    } catch (err: any) {
      toast.error("Couldn't start checkout", { description: err.message });
      setPurchaseState("idle");
      setSelectedPkg(null);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Buy Credits</h1>
            <p className="text-muted-foreground text-sm">Power your tips, boosts & features</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card border border-border p-6 md:p-8"
        >
          <Sparkles className="absolute top-4 right-4 h-8 w-8 text-primary/30 animate-pulse" />
          <div className="flex items-center gap-3 mb-2">
            <Coins className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">Your Balance</span>
          </div>
          <p className="text-4xl font-bold text-foreground tracking-tight">
            {wallet?.credits ?? 0}{" "}
            <span className="text-lg font-normal text-muted-foreground">credits</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Use credits to tip creators, boost streams & unlock features
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {packages.map((pkg: any, i: number) => {
              const Icon = iconMap[i] || Coins;
              const badge = badgeMap[i];
              const isSelected = selectedPkg === pkg.id;
              const isProcessing = isSelected && purchaseState === "processing";
              const isUnavailable = !pkg.stripe_price_id;

              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card
                    className={`relative overflow-hidden p-5 transition-all duration-200 border-2 ${
                      isUnavailable
                        ? "border-border opacity-60 cursor-not-allowed"
                        : isSelected
                        ? "border-primary shadow-[var(--glow-shadow)] cursor-pointer"
                        : "border-border hover:border-primary/40 cursor-pointer"
                    }`}
                    onClick={() => !isUnavailable && purchaseState === "idle" && handlePurchase(pkg)}
                  >
                    <div className="relative z-10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <span className="font-semibold text-foreground">{pkg.label}</span>
                        </div>
                        {badge && (
                          <Badge variant="secondary" className="bg-primary/15 text-primary border-0 text-[10px] font-bold uppercase tracking-wider">
                            {badge}
                          </Badge>
                        )}
                      </div>
                      <div>
                        <span className="text-3xl font-bold text-foreground">{pkg.credits}</span>
                        <span className="text-sm text-muted-foreground ml-1">credits</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <span className="text-xl font-bold text-foreground">${pkg.price_usd}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({(pkg.price_usd / pkg.credits * 100).toFixed(1)}¢/credit)
                          </span>
                        </div>
                        {isProcessing ? (
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        ) : isUnavailable ? (
                          <Button size="sm" variant="secondary" disabled className="rounded-full px-4">
                            Coming Soon
                          </Button>
                        ) : (
                          <Button size="sm" className="rounded-full px-4">Buy</Button>
                        )}
                      </div>
                      {isUnavailable && (
                        <p className="text-[11px] text-muted-foreground pt-1">
                          Contact support to purchase
                        </p>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Payments powered by Stripe. Credits are non-refundable.
        </p>
      </div>
    </AppLayout>
  );
};

export default BuyCredits;
