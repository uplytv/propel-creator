import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Tag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Tier {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly?: number | null;
  stripe_price_id: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tiers: Tier[];
  creatorId: string;
}

export default function TierSelectionModal({ open, onClose, tiers, creatorId }: Props) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [billing, setBilling] = useState<"month" | "year">("month");

  const hasAnnual = tiers.some((t) => Number(t.price_yearly) > 0);

  const savingsPct = (tier: Tier) => {
    const monthly = Number(tier.price_monthly) || 0;
    const yearly = Number(tier.price_yearly) || 0;
    if (monthly <= 0 || yearly <= 0) return 0;
    return Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100));
  };

  const handleJoin = async () => {
    if (!selectedTier) return;
    setLoading(true);
    try {
      const tier = tiers.find((t) => t.id === selectedTier);
      // Annual only when toggled on AND the chosen tier offers a yearly price
      const interval: "month" | "year" =
        billing === "year" && Number(tier?.price_yearly) > 0 ? "year" : "month";
      const { data, error } = await supabase.functions.invoke("stripe-create-checkout", {
        body: { tier_id: selectedTier, creator_id: creatorId, interval },
      });
      if (error) throw error;
      if (data?.url) {
        sessionStorage.setItem("uply_pending_join", JSON.stringify({
          creator_id: creatorId,
          return_path: window.location.pathname,
        }));
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="relative w-full max-w-md mx-4 mb-4 sm:mb-0"
          >
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-base font-bold text-foreground">Choose a Plan</h3>
                <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                {/* Monthly / Annual toggle — only when a tier offers annual */}
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

                {tiers.map((tier) => {
                  const tierHasAnnual = Number(tier.price_yearly) > 0;
                  const showAnnual = billing === "year" && tierHasAnnual;
                  const savePct = savingsPct(tier);
                  return (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(tier.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selectedTier === tier.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-foreground">{tier.name}</span>
                          {showAnnual && savePct > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                              Save {savePct}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {showAnnual ? (
                            <>
                              <span className="text-lg font-bold text-primary">${tier.price_yearly}</span>
                              <span className="text-xs text-muted-foreground">/yr</span>
                            </>
                          ) : (
                            <>
                              <span className="text-lg font-bold text-primary">${tier.price_monthly}</span>
                              <span className="text-xs text-muted-foreground">/mo</span>
                            </>
                          )}
                          {selectedTier === tier.id && <Check className="w-4 h-4 text-primary" />}
                        </div>
                      </div>
                      {tier.description && (
                        <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                      )}
                      {billing === "year" && !tierHasAnnual && (
                        <p className="text-[10px] text-muted-foreground mt-1">Monthly billing only</p>
                      )}
                    </button>
                  );
                })}
                <Button
                  onClick={handleJoin}
                  disabled={!selectedTier || loading}
                  className="w-full mt-2 gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Subscribe & Join
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">
                  Cancel anytime. 5% platform fee applies.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
