import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Sentry } from "@/lib/sentry";
import { memberAuthUrl } from "@/lib/memberAuth";

const TYPE_LABELS: Record<string, string> = {
  membership_tier: "Membership",
  product: "Product",
  course: "Course",
  classroom: "Classroom",
  pdf: "PDF",
  community: "Community",
  stream: "Live Stream",
  job_post: "Job Post",
};

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  resourceType: string;
  resourceId: string;
  price: number;
  billingType: "one_time" | "recurring";
  title: string;
  description?: string;
  thumbnailUrl?: string | null;
  source?: string;
  streamId?: string | null;
  creatorId?: string;
  onSuccess?: () => void;
}

export default function PaywallModal({
  open,
  onClose,
  resourceType,
  resourceId,
  price,
  billingType,
  title,
  description,
  thumbnailUrl,
  source = "checkout",
  streamId,
  creatorId,
  onSuccess,
}: PaywallModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchased, setPurchased] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      // Account required before checkout — free member signup, then return.
      navigate(memberAuthUrl());
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const fnName = billingType === "recurring"
        ? "stripe-create-checkout"
        : "stripe-create-product-checkout";

      const body: Record<string, any> = {
        purchase_type: billingType === "recurring" ? "subscription" : "course",
        success_url: `${window.location.origin}${window.location.pathname}?access_granted=true&resource_id=${resourceId}`,
        cancel_url: window.location.href,
        metadata: {
          user_id: user.id,
          resource_type: resourceType,
          resource_id: resourceId,
          source,
          stream_id: streamId || "",
          purchase_type: billingType === "recurring" ? "subscription" : "course",
        },
      };

      if (billingType === "recurring") {
        body.creator_id = creatorId;
        body.member_id = user.id;
      } else {
        body.product_id = resourceId;
        body.creator_id = creatorId;
      }

      const { data, error: fnError } = await supabase.functions.invoke(fnName, { body });
      if (fnError) throw fnError;

      if (data?.already_purchased) {
        setPurchased(true);
        // Brief success confirmation before closing
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 900);
        return;
      }

      if (data?.url) {
        sessionStorage.setItem("uply_pending_access", JSON.stringify({
          resource_type: resourceType,
          resource_id: resourceId,
          return_path: window.location.pathname,
        }));
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      const msg = err?.message || "Payment failed — please try again.";
      setError(msg);
      Sentry.captureException(err, { tags: { context: "paywall" } });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    handlePurchase();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center"
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md sm:mx-4"
          >
            <div className="rounded-t-2xl sm:rounded-2xl border border-border bg-card overflow-hidden">
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-background/60 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Thumbnail */}
              {thumbnailUrl ? (
                <div className="aspect-video w-full overflow-hidden">
                  <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-4xl font-black text-primary/30">UPLY</span>
                </div>
              )}

              <div className="p-5 space-y-4">
                {/* Type badge */}
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {TYPE_LABELS[resourceType] || resourceType}
                </span>

                {/* Title + desc */}
                <div>
                  <h3 className="text-xl font-bold text-foreground">{title}</h3>
                  {description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
                  )}
                </div>

                <div className="h-px bg-border" />

                {/* Price */}
                <div>
                  <span className="text-4xl font-extrabold text-foreground">${price}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {billingType === "recurring" ? "/month" : "one-time payment"}
                  </span>
                </div>

                {/* CTA */}
                <Button
                  onClick={purchased ? undefined : handlePurchase}
                  disabled={loading || purchased}
                  className="w-full h-12 text-base font-bold"
                >
                  {purchased ? (
                    <><CheckCircle2 className="w-5 h-5" /> Access granted</>
                  ) : loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : billingType === "recurring" ? (
                    `Subscribe · $${price}/mo`
                  ) : (
                    `Buy Now · $${price}`
                  )}
                </Button>

                {/* Error with retry */}
                {error && !purchased && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive flex-1">{error}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetry}
                      disabled={loading}
                      className="w-full"
                    >
                      Try again
                    </Button>
                  </div>
                )}

                {/* Footer */}
                <div className="space-y-1">
                  <p className="text-[11px] text-center text-muted-foreground">
                    <Lock className="w-3 h-3 inline mr-1" />
                    Secure payment powered by Stripe
                  </p>
                  <p className="text-[11px] text-center text-muted-foreground">
                    {billingType === "recurring"
                      ? "Cancel anytime from Settings"
                      : "Instant access after payment · No subscription required"}
                  </p>
                </div>

                {/* Alt link */}
                <button
                  onClick={() => navigate("/auth")}
                  className="text-xs text-muted-foreground hover:text-foreground text-center w-full"
                >
                  Already have access? Sign in to a different account
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
