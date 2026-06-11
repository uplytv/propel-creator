import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, BookOpen, Layers, Award, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sentry } from "@/lib/sentry";

interface Props {
  open: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    user_id: string;
  };
  creatorName?: string;
  creatorAvatar?: string;
  creatorUsername?: string;
  lessonCount?: number;
  moduleCount?: number;
}

export default function CourseEnrollSheet({
  open, onClose, product, creatorName, creatorAvatar, creatorUsername,
  lessonCount = 0, moduleCount = 0,
}: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Check if already purchased
  const { data: alreadyPurchased } = useQuery({
    queryKey: ["product-purchase", product.id, user?.id],
    enabled: !!product.id && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_purchases")
        .select("id")
        .eq("product_id", product.id)
        .eq("buyer_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  // Check creator Stripe status
  const { data: stripeStatus } = useQuery({
    queryKey: ["creator-stripe-status", product.user_id],
    enabled: !!product.user_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_stripe_accounts")
        .select("charges_enabled, details_submitted")
        .eq("creator_id", product.user_id)
        .maybeSingle();
      return data;
    },
  });

  const handleEnroll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const origin = window.location.origin;
      const successUrl = `${origin}/creator/${creatorUsername || product.user_id}?enrolled=true&product_id=${product.id}`;
      const cancelUrl = `${origin}/creator/${creatorUsername || product.user_id}`;

      const { data, error } = await supabase.functions.invoke("stripe-create-product-checkout", {
        body: {
          product_id: product.id,
          creator_id: product.user_id,
          purchase_type: "course",
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
      });
      if (error) throw error;
      if (data?.already_purchased) {
        toast.success("Already enrolled! ✅");
        onClose();
        return;
      }
      if (data?.url) {
        sessionStorage.setItem("uply_pending_purchase", JSON.stringify({
          product_id: product.id,
          return_path: window.location.pathname,
        }));
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error("Payment couldn't start — please try again");
      Sentry.captureException(err, { tags: { context: "course_checkout" } });
    }
    setLoading(false);
  };

  if (alreadyPurchased) return null;

  const canPurchase = stripeStatus?.charges_enabled && product.price > 0;
  const stripePending = stripeStatus?.details_submitted && !stripeStatus?.charges_enabled;
  const noStripe = !stripeStatus;

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
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md sm:mx-4 sm:mb-0"
          >
            <div className="rounded-t-2xl sm:rounded-2xl border border-border bg-card overflow-hidden">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-background/60 text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Thumbnail */}
              {product.image_url && (
                <div className="aspect-video w-full overflow-hidden">
                  <img src={product.image_url} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-5 space-y-4">
                {/* Title + Creator */}
                <div>
                  <h3 className="text-xl font-bold text-foreground">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    {creatorAvatar ? (
                      <img src={creatorAvatar} className="w-8 h-8 rounded-full object-cover" alt={`${creatorName || "Creator"} avatar`} loading="lazy" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                        {(creatorName || "C").charAt(0)}
                      </div>
                    )}
                    <span className="text-sm text-muted-foreground">{creatorName || "Creator"}</span>
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* What's included */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What's included</p>
                  <div className="grid grid-cols-2 gap-2">
                    {lessonCount > 0 && (
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <BookOpen className="w-4 h-4 text-primary" /> {lessonCount} lessons
                      </div>
                    )}
                    {moduleCount > 0 && (
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Layers className="w-4 h-4 text-primary" /> {moduleCount} modules
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Award className="w-4 h-4 text-primary" /> Lifetime access
                    </div>
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Price */}
                <div>
                  <span className="text-4xl font-extrabold text-foreground">${product.price}</span>
                  <span className="text-sm text-muted-foreground ml-2">one-time payment</span>
                </div>

                {/* CTA */}
                {canPurchase ? (
                  <Button
                    onClick={handleEnroll}
                    disabled={loading}
                    className="w-full h-12 text-base font-bold"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Enroll Now — $${product.price}`}
                  </Button>
                ) : stripePending ? (
                  <Button disabled className="w-full h-12 text-base">
                    Setup In Progress
                  </Button>
                ) : noStripe ? (
                  <p className="text-xs text-muted-foreground text-center">Payment setup coming soon</p>
                ) : (
                  <Button
                    onClick={handleEnroll}
                    disabled={loading}
                    className="w-full h-12 text-base font-bold"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Enroll Now — $${product.price}`}
                  </Button>
                )}

                <div className="space-y-1">
                  <p className="text-[11px] text-center text-muted-foreground">
                    <Lock className="w-3 h-3 inline mr-1" />
                    Secure payment powered by Stripe
                  </p>
                  <p className="text-[11px] text-center text-muted-foreground">
                    Instant access after payment · No subscription required
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
