import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Ticket, ShieldCheck, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Props {
  eventId: string;
  eventTitle: string;
  faceValueCents?: number;
  resaleAllowed?: boolean;
  resaleCapPct?: number;
}

interface Listing {
  id: string;
  ticket_id: string;
  asking_price_cents: number;
  listing_type: string;
  seller_id: string;
  tickets?: { seat_label: string | null };
}

export default function ResaleListings({
  eventId,
  eventTitle,
  faceValueCents,
  resaleAllowed,
  resaleCapPct = 120,
}: Props) {
  const { user } = useAuth();
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const { data: listings, isLoading } = useQuery({
    queryKey: ["resale-listings", eventId],
    enabled: !!eventId && !!resaleAllowed,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_listings")
        .select("id, ticket_id, asking_price_cents, listing_type, seller_id, tickets(seat_label)")
        .eq("event_id", eventId)
        .eq("status", "active")
        .order("asking_price_cents", { ascending: true });
      if (error) throw error;
      return (data || []) as Listing[];
    },
  });

  if (!resaleAllowed) return null;
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!listings || listings.length === 0) return null;

  const cap = faceValueCents ? Math.round((faceValueCents * resaleCapPct) / 100) : null;

  const handleBuy = async (listing: Listing) => {
    if (!user) {
      toast.error("Please sign in to buy a resale ticket");
      return;
    }
    if (listing.seller_id === user.id) {
      toast.error("You cannot buy your own listing");
      return;
    }
    setBuyingId(listing.id);
    try {
      const { data, error } = await supabase.functions.invoke("buy-resale-ticket", {
        body: {
          listing_id: listing.id,
          success_url: `${window.location.origin}/tickets/success?event=${eventId}`,
          cancel_url: window.location.href,
        },
      });
      if (error) throw error;
      const url = (data as any)?.url;
      if (!url) throw new Error("No checkout URL returned");
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start checkout");
      setBuyingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Resale tickets</h3>
          <Badge variant="secondary">{listings.length} available</Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          Capped at {resaleCapPct}% of face value
        </div>
      </div>

      <ul className="divide-y divide-border">
        {listings.map((l) => {
          const overCap = cap != null && l.asking_price_cents > cap;
          return (
            <li key={l.id} className="flex items-center justify-between py-3 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {l.tickets?.seat_label ? `Seat ${l.tickets.seat_label}` : "General Admission"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {eventTitle} • Verified ticket
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-base font-bold text-foreground">
                    ${(l.asking_price_cents / 100).toFixed(2)}
                  </p>
                  {faceValueCents != null && (
                    <p className="text-[10px] text-muted-foreground">
                      face ${(faceValueCents / 100).toFixed(2)}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleBuy(l)}
                  disabled={buyingId === l.id || overCap || l.seller_id === user?.id}
                  className="gap-2 min-h-[44px]"
                >
                  {buyingId === l.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Ticket className="w-4 h-4" />
                  )}
                  Buy
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
