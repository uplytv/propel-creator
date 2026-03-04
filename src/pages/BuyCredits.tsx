import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Zap, Crown, Rocket, Check, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AppLayout from "@/components/layout/AppLayout";

const packages = [
  {
    id: "starter",
    name: "Starter",
    credits: 50,
    price: 5,
    icon: Coins,
    perCredit: "10¢",
    color: "from-muted to-secondary",
    badge: null,
  },
  {
    id: "popular",
    name: "Popular",
    credits: 120,
    price: 10,
    icon: Zap,
    perCredit: "8.3¢",
    color: "from-primary/20 to-primary/5",
    badge: "Best Value",
  },
  {
    id: "pro",
    name: "Pro",
    credits: 300,
    price: 20,
    icon: Crown,
    perCredit: "6.7¢",
    color: "from-amber-500/20 to-amber-500/5",
    badge: "Save 33%",
  },
  {
    id: "mega",
    name: "Mega",
    credits: 800,
    price: 45,
    icon: Rocket,
    perCredit: "5.6¢",
    color: "from-purple-500/20 to-purple-500/5",
    badge: "Save 44%",
  },
];

type PurchaseState = "idle" | "processing" | "success";

const BuyCredits = () => {
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [purchaseState, setPurchaseState] = useState<PurchaseState>("idle");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handlePurchase = (pkgId: string) => {
    setSelectedPkg(pkgId);
    setPurchaseState("processing");

    // Simulated payment
    setTimeout(() => {
      setPurchaseState("success");
      const pkg = packages.find((p) => p.id === pkgId);
      toast({
        title: "Credits added! 🎉",
        description: `${pkg?.credits} credits have been added to your account.`,
      });
      setTimeout(() => {
        setPurchaseState("idle");
        setSelectedPkg(null);
      }, 2500);
    }, 2000);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Buy Credits</h1>
            <p className="text-muted-foreground text-sm">
              Power your tips, boosts & features
            </p>
          </div>
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card border border-border p-6 md:p-8"
        >
          <Sparkles className="absolute top-4 right-4 h-8 w-8 text-primary/30 animate-pulse" />
          <div className="flex items-center gap-3 mb-2">
            <Coins className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">
              Your Balance
            </span>
          </div>
          <p className="text-4xl font-bold text-foreground tracking-tight">
            100{" "}
            <span className="text-lg font-normal text-muted-foreground">
              credits
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Use credits to tip creators, boost streams & unlock features
          </p>
        </motion.div>

        {/* Packages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {packages.map((pkg, i) => {
            const Icon = pkg.icon;
            const isSelected = selectedPkg === pkg.id;
            const isProcessing =
              isSelected && purchaseState === "processing";
            const isSuccess = isSelected && purchaseState === "success";

            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card
                  className={`relative overflow-hidden p-5 cursor-pointer transition-all duration-200 border-2 ${
                    isSelected
                      ? "border-primary shadow-[var(--glow-shadow)]"
                      : "border-border hover:border-primary/40 hover:shadow-[var(--glow-shadow)]"
                  }`}
                  onClick={() =>
                    purchaseState === "idle" && handlePurchase(pkg.id)
                  }
                >
                  {/* Background gradient */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${pkg.color} opacity-40`}
                  />

                  <div className="relative z-10 space-y-3">
                    {/* Top row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground">
                          {pkg.name}
                        </span>
                      </div>
                      {pkg.badge && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/15 text-primary border-0 text-[10px] font-bold uppercase tracking-wider"
                        >
                          {pkg.badge}
                        </Badge>
                      )}
                    </div>

                    {/* Credits */}
                    <div>
                      <span className="text-3xl font-bold text-foreground">
                        {pkg.credits}
                      </span>
                      <span className="text-sm text-muted-foreground ml-1">
                        credits
                      </span>
                    </div>

                    {/* Price & action */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-xl font-bold text-foreground">
                          ${pkg.price}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({pkg.perCredit}/credit)
                        </span>
                      </div>

                      <AnimatePresence mode="wait">
                        {isProcessing ? (
                          <motion.div
                            key="processing"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"
                          />
                        ) : isSuccess ? (
                          <motion.div
                            key="success"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
                          >
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <Button size="sm" className="rounded-full px-4">
                              Buy
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Info */}
        <p className="text-center text-xs text-muted-foreground">
          Credits are non-refundable. Payments are simulated for demo purposes.
        </p>
      </div>
    </AppLayout>
  );
};

export default BuyCredits;
