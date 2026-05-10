import { useParams } from "react-router-dom";
import { Calendar, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConcert, useMyTicket, usePurchaseTicket } from "../hooks/useConcerts";
import { EncoreBidPanel } from "../components/EncoreBidPanel";
import { ConcertMerchCarousel } from "../components/ConcertMerchCarousel";
import { toast } from "sonner";

export default function ConcertPage() {
  const { id } = useParams<{ id: string }>();
  const { data: concert, isLoading } = useConcert(id);
  const { data: ticket } = useMyTicket(id);
  const purchase = usePurchaseTicket();

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Loading…</div>;
  if (!concert) return <div className="p-6 text-center text-muted-foreground">Concert not found.</div>;

  const buy = async () => {
    try {
      await purchase.mutateAsync({ concert_id: concert.id, paid_cents: concert.ticket_price_cents, currency: concert.currency });
      toast.success("Ticket secured!");
    } catch (e: any) {
      toast.error(e.message ?? "Purchase failed");
    }
  };

  const hasTicket = !!ticket;
  const isFree = concert.ticket_price_cents === 0;

  return (
    <div className="mobile-safe-content max-w-2xl mx-auto p-4 space-y-5">
      <div className="aspect-video rounded-2xl overflow-hidden bg-muted">
        {concert.cover_url && <img src={concert.cover_url} alt={concert.title} className="w-full h-full object-cover" />}
      </div>

      <div>
        <h1 className="text-2xl font-bold">{concert.title}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <Calendar className="h-4 w-4" />
          {new Date(concert.starts_at).toLocaleString()}
        </div>
      </div>

      {concert.description && <p className="text-sm text-muted-foreground">{concert.description}</p>}

      {!hasTicket ? (
        <Button onClick={buy} disabled={purchase.isPending} size="lg" className="w-full">
          <Ticket className="h-4 w-4 mr-2" />
          {isFree ? "Get free ticket" : `Buy ticket – $${(concert.ticket_price_cents / 100).toFixed(2)}`}
        </Button>
      ) : (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm">
          ✓ You're in. Stream unlocks at showtime.
        </div>
      )}

      {hasTicket && concert.stream_url && (
        <div className="aspect-video rounded-2xl overflow-hidden bg-black">
          <iframe src={concert.stream_url} className="w-full h-full" allow="autoplay; fullscreen" />
        </div>
      )}

      <ConcertMerchCarousel concertId={concert.id} />
      <EncoreBidPanel concertId={concert.id} />
    </div>
  );
}
