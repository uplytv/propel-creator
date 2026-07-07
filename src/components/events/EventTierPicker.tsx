import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getEventPromoCode } from "@/lib/eventPromo";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Loader2, Check, Ticket } from "lucide-react";
import { toast } from "sonner";

interface Tier {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  quantity_total: number | null;
  quantity_sold: number | null;
  quantity_reserved: number | null;
  per_user_limit: number | null;
  sales_start_at: string | null;
  sales_end_at: string | null;
  perks: string[] | null;
  sort_order: number | null;
}

function available(t: Tier): number | null {
  if (t.quantity_total == null) return null; // unlimited
  return Math.max(0, t.quantity_total - (t.quantity_sold ?? 0) - (t.quantity_reserved ?? 0));
}

function onSale(t: Tier): boolean {
  const now = Date.now();
  if (t.sales_start_at && new Date(t.sales_start_at).getTime() > now) return false;
  if (t.sales_end_at && new Date(t.sales_end_at).getTime() < now) return false;
  return true;
}

/**
 * Multi-tier ticket picker. Self-hides when the event has no tiers, so it can
 * be rendered unconditionally alongside the existing single-price flow without
 * affecting events that don't use tiers.
 */
export default function EventTierPicker({ eventId }: { eventId: string; eventTitle?: string }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [buying, setBuying] = useState<string | null>(null);

  const { data: tiers, isLoading } = useQuery({
    queryKey: ["event-tiers", eventId],
    queryFn: async () => {
      const { data } = await supabase
        .from("ticket_tiers")
        .select("*")
        .eq("event_id", eventId)
        .eq("is_hidden", false)
        .order("sort_order", { ascending: true });
      return (data ?? []) as unknown as Tier[];
    },
  });

  if (isLoading || !tiers || tiers.length === 0) return null;

  const buy = async (tier: Tier) => {
    setBuying(tier.id);
    try {
      const quantity = qty[tier.id] ?? 1;
      // Promoter attribution: forward the captured ?promo= code (if any) so
      // the finalized order can be credited to the promoter. Tracking only.
      const promoCode = getEventPromoCode(eventId);
      const { data, error } = await supabase.functions.invoke("purchase-ticket", {
        body: {
          tier_id: tier.id,
          quantity,
          ...(promoCode ? { promo_code: promoCode } : {}),
          success_url: `${window.location.origin}/tickets/success`,
          cancel_url: window.location.href,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url as string;
      } else {
        throw new Error(data?.error ?? "Could not start checkout");
      }
    } catch (e) {
      toast.error("Checkout failed", { description: (e as Error).message });
      setBuying(null);
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
        <Ticket className="w-5 h-5 text-primary" /> Tickets
      </h2>
      <div className="space-y-3">
        {tiers.map((tier) => {
          const avail = available(tier);
          const saleOpen = onSale(tier);
          const soldOut = avail === 0;
          const max = Math.min(tier.per_user_limit ?? 8, avail ?? 8, 8) || 1;
          const q = qty[tier.id] ?? 1;
          const disabled = soldOut || !saleOpen || buying === tier.id;
          return (
            <div
              key={tier.id}
              className={`rounded-xl border border-border bg-card p-4 flex flex-col gap-3 ${soldOut ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground flex items-center gap-2">
                    {tier.name}
                    {soldOut && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Sold out</span>
                    )}
                  </p>
                  {tier.description && (
                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                  )}
                  {Array.isArray(tier.perks) && tier.perks.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {tier.perks.map((perk, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-primary shrink-0" /> {perk}
                        </li>
                      ))}
                    </ul>
                  )}
                  {avail != null && avail > 0 && avail <= 20 && (
                    <p className="text-xs text-destructive mt-2">Only {avail} left</p>
                  )}
                  {!saleOpen && !soldOut && (
                    <p className="text-xs text-muted-foreground mt-2">Not on sale yet</p>
                  )}
                </div>
                <p className="text-lg font-bold text-foreground whitespace-nowrap">
                  ${(tier.price_cents / 100).toFixed(2)}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center border border-border rounded-lg overflow-hidden h-10">
                  <button
                    aria-label="Decrease quantity"
                    className="w-10 h-10 flex items-center justify-center disabled:opacity-30"
                    onClick={() => setQty((s) => ({ ...s, [tier.id]: Math.max(1, q - 1) }))}
                    disabled={q <= 1 || disabled}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{q}</span>
                  <button
                    aria-label="Increase quantity"
                    className="w-10 h-10 flex items-center justify-center disabled:opacity-30"
                    onClick={() => setQty((s) => ({ ...s, [tier.id]: Math.min(max, q + 1) }))}
                    disabled={q >= max || disabled}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <Button
                  onClick={() => buy(tier)}
                  disabled={disabled}
                  className={`gap-2 flex-1 max-w-[200px] ${soldOut || !saleOpen ? "" : "bg-brand-gradient brand-glow text-white border-0 hover:opacity-90"}`}
                >
                  {buying === tier.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : soldOut ? (
                    "Sold Out"
                  ) : (
                    <>Get {tier.name}</>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">✓ No hidden fees — your total is shown before you pay. Secure checkout via Stripe.</p>
    </div>
  );
}
