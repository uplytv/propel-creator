import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

// Backoff between finalize attempts — Stripe can redirect back a beat before
// the payment intent settles, so 402 "not completed yet" is retried.
const RETRY_DELAYS_MS = [1500, 3000, 6000, 10000];

/**
 * Handles the return from a cart Stripe Checkout (/shop?checkout=success&session_id=...).
 * Calls finalize-cart-order (idempotent) with retry/backoff and reports the result.
 * Renders nothing.
 */
export default function CartCheckoutReturn() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");

    const clearParams = () => {
      const next = new URLSearchParams(searchParams);
      next.delete("checkout");
      next.delete("session_id");
      setSearchParams(next, { replace: true });
    };

    if (checkout === "cancel") {
      startedRef.current = true;
      toast.info("Checkout canceled — your cart is saved.");
      clearParams();
      return;
    }

    if (checkout !== "success" || !sessionId) return;
    if (!user) return; // wait for the auth session to hydrate, then re-run
    startedRef.current = true;

    const run = async () => {
      const toastId = toast.loading("Confirming your order…");
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        try {
          const { data, error } = await supabase.functions.invoke("finalize-cart-order", {
            body: { session_id: sessionId },
          });
          if (error) throw error;
          if (data?.processing) throw new Error("Order is still being processed");
          if (data?.ok) {
            const names: string[] = (data.items ?? [])
              .map((i: { name?: string }) => i.name)
              .filter(Boolean);
            toast.success(
              data.already ? "Order already confirmed ✅" : "Order confirmed! 🎉",
              {
                id: toastId,
                description:
                  names.length > 0
                    ? `${names.length} item${names.length === 1 ? "" : "s"} unlocked: ${names.join(", ")}`
                    : undefined,
                duration: 8000,
              }
            );
            clearParams();
            return;
          }
          throw new Error(data?.error || "Unexpected response");
        } catch (_e) {
          if (attempt < RETRY_DELAYS_MS.length) {
            await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
            continue;
          }
          toast.error("Payment received — order confirmation is taking longer than usual.", {
            id: toastId,
            description: "Your items will appear shortly. Refresh this page, or contact support if they don't.",
            duration: 12000,
          });
          clearParams();
        }
      }
    };
    run();
  }, [searchParams, setSearchParams, user]);

  return null;
}
