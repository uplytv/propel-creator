/**
 * @deprecated Use `<GatedContent>` from `@/components/GatedContent` instead.
 * GatedContent is the canonical gating pattern (see Core memory). This file is
 * preserved because it has live importers; migrate them, then archive.
 * Current importers: pages/Wallet.
 */
import { useState } from "react";
import { CreditCard, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStripeAccount } from "@/hooks/useStripeAccount";
import { toast } from "sonner";
import { useReauthGuard } from "@/hooks/useReauthGuard";
import ReauthDialog from "@/components/ReauthDialog";

interface StripeGateProps {
  children: React.ReactNode;
}

/**
 * StripeGate no longer blocks access. It renders children always,
 * and shows an optional banner prompting Stripe Connect for instant payouts
 * if the creator hasn't connected yet.
 */
export default function StripeGate({ children }: StripeGateProps) {
  const { data: stripeAccount, isLoading } = useStripeAccount();
  const [connecting, setConnecting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { showReauth, reauthLoading, requireReauth, confirmReauth, cancelReauth } = useReauthGuard();

  const doConnect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error("Error", { description: err.message });
    }
    setConnecting(false);
  };

  const handleConnect = () => requireReauth(doConnect);

  const showBanner = !isLoading && !dismissed && (!stripeAccount || !stripeAccount.charges_enabled);

  return (
    <>
      {showBanner && (
        <div className="mx-4 md:mx-8 mt-4 mb-2 relative rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-4">
          <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Want instant payouts?
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect Stripe to receive earnings directly to your bank. Otherwise we'll hold your balance for manual payout requests.
            </p>
            <Button
              onClick={handleConnect}
              disabled={connecting}
              size="sm"
              className="mt-2 gap-1.5 rounded-lg text-xs h-8"
            >
              {connecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Connect Stripe
            </Button>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <ReauthDialog open={showReauth} loading={reauthLoading} onConfirm={confirmReauth} onCancel={cancelReauth} />
      {children}
    </>
  );
}
