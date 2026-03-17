import { useState } from "react";
import { CreditCard, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStripeAccount } from "@/hooks/useStripeAccount";
import { useToast } from "@/hooks/use-toast";

interface StripeGateProps {
  children: React.ReactNode;
}

export default function StripeGate({ children }: StripeGateProps) {
  const { data: stripeAccount, isLoading } = useStripeAccount();
  const { toast } = useToast();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setConnecting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stripeAccount || !stripeAccount.charges_enabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
          <CreditCard className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Connect Stripe to get paid</h2>
        <p className="text-muted-foreground mb-8 max-w-sm">
          Takes 2 minutes. You keep 95% of everything you earn.
        </p>
        <Button
          onClick={handleConnect}
          disabled={connecting}
          size="lg"
          className="gap-2 rounded-xl px-8"
        >
          {connecting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          Connect Stripe
        </Button>
        <p className="text-xs text-muted-foreground mt-4 max-w-xs">
          Powered by Stripe. Your banking details are never stored on our servers.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
