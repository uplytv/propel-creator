import { useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WalletPassButtonsProps {
  ticketId: string;
  className?: string;
}

type Provider = "apple" | "google";

const PROVIDER_META: Record<Provider, { fn: string; label: string; sub: string }> = {
  apple: { fn: "apple-wallet-pass", label: "Add to Apple Wallet", sub: "iPhone · Apple Watch" },
  google: { fn: "google-wallet-pass", label: "Add to Google Wallet", sub: "Android · Wear OS" },
};

export default function WalletPassButtons({ ticketId, className }: WalletPassButtonsProps) {
  const [loading, setLoading] = useState<Provider | null>(null);

  async function handleAdd(provider: Provider) {
    setLoading(provider);
    try {
      const { data, error } = await supabase.functions.invoke(PROVIDER_META[provider].fn, {
        body: { ticket_id: ticketId },
      });
      if (error) throw error;

      // Real pass: data.pass_url (Google) or data.pkpass_url (Apple) → open it
      const url = (data as any)?.pass_url || (data as any)?.pkpass_url;
      if (url) {
        window.location.href = url;
        return;
      }

      // Stub response — graceful "coming soon" path
      toast.info(`${provider === "apple" ? "Apple" : "Google"} Wallet passes coming soon`, {
        description: "Show the QR on this screen at the door — it works the same.",
      });
    } catch (err: any) {
      toast.error("Couldn't add to wallet", { description: err.message ?? "Try again shortly." });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={`grid grid-cols-2 gap-2 ${className ?? ""}`}>
      {(Object.keys(PROVIDER_META) as Provider[]).map((p) => (
        <Button
          key={p}
          variant="outline"
          className="w-full gap-2 h-11"
          onClick={() => handleAdd(p)}
          disabled={loading !== null}
          aria-label={PROVIDER_META[p].label}
        >
          {loading === p ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Smartphone className="w-4 h-4" />
          )}
          <span className="text-xs font-medium">
            {p === "apple" ? "Apple Wallet" : "Google Wallet"}
          </span>
        </Button>
      ))}
    </div>
  );
}
