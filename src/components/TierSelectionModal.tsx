import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Tag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Tier {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  stripe_price_id: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  tiers: Tier[];
  creatorId: string;
}

export default function TierSelectionModal({ open, onClose, tiers, creatorId }: Props) {
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!selectedTier) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-create-checkout", {
        body: { tier_id: selectedTier, creator_id: creatorId },
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
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
                {tiers.map((tier) => (
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
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">${tier.price_monthly}</span>
                        <span className="text-xs text-muted-foreground">/mo</span>
                        {selectedTier === tier.id && <Check className="w-4 h-4 text-primary" />}
                      </div>
                    </div>
                    {tier.description && (
                      <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                    )}
                  </button>
                ))}
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
