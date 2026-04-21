import { useState } from "react";
import { Rocket, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BOOST_TIERS, useStartBoostCheckout, type BoostTier } from "@/hooks/useBoosts";
import { toast } from "sonner";

interface Props {
  contentId: string;
  contentType: "video" | "clip" | "recording" | "stream" | "post";
  variant?: "default" | "compact";
}

export default function BoostButton({ contentId, contentType, variant = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<BoostTier>("growth");
  const start = useStartBoostCheckout();

  const handleBoost = async () => {
    try {
      await start.mutateAsync({ content_id: contentId, content_type: contentType, tier });
      toast.success("Opening secure checkout…");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Could not start checkout");
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size={variant === "compact" ? "sm" : "default"}
        className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground gap-2"
      >
        <Rocket className="w-4 h-4" />
        Boost
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" /> Boost this {contentType}
            </DialogTitle>
            <DialogDescription>
              Get featured in front of more viewers in the Discover feed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {(Object.keys(BOOST_TIERS) as BoostTier[]).map((key) => {
              const t = BOOST_TIERS[key];
              const isSelected = tier === key;
              return (
                <button
                  key={key}
                  onClick={() => setTier(key)}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground flex items-center gap-2">
                        {t.label}
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    </div>
                    <p className="text-lg font-bold text-primary">${t.price}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <Button onClick={handleBoost} disabled={start.isPending} className="w-full" size="lg">
            {start.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : `Continue to checkout — $${BOOST_TIERS[tier].price}`}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Secure payment powered by Stripe. Boost activates instantly after payment.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
