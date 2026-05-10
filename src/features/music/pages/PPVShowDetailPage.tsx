import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { usePPVShow, useMyPPVTicket, usePurchasePPVTicket } from "../hooks/usePPVShows";

export default function PPVShowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: show, isLoading } = usePPVShow(id);
  const { data: ticket } = useMyPPVTicket(id);
  const purchase = usePurchasePPVTicket();

  if (isLoading) return <div className="p-4 text-muted-foreground">Loading…</div>;
  if (!show) return <div className="p-4 text-muted-foreground">Show not found.</div>;

  const hasAccess = ticket?.status === "paid";
  const price = (show.price_cents / 100).toFixed(2);

  const handleBuy = async () => {
    try {
      await purchase.mutateAsync({ show_id: show.id, amount_cents: show.price_cents, currency: show.currency });
      toast.success("Ticket purchased");
    } catch (e: any) {
      toast.error(e.message ?? "Purchase failed");
    }
  };

  return (
    <div className="p-4 space-y-4 mobile-safe-content">
      <Card className="overflow-hidden bg-card/40">
        {show.cover_url && (
          <div className="aspect-video bg-muted overflow-hidden">
            <img src={show.cover_url} alt={show.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-bold">{show.title}</h1>
            <Badge variant={show.status === "live" ? "default" : "secondary"} className="capitalize">
              {show.status}
            </Badge>
          </div>
          {show.description && <p className="text-sm text-muted-foreground">{show.description}</p>}
          <div className="text-sm text-muted-foreground">
            Starts {new Date(show.scheduled_start).toLocaleString()} · {show.duration_minutes} min
          </div>
        </div>
      </Card>

      {hasAccess ? (
        <Card className="p-4 space-y-3 bg-card/40">
          <div className="text-sm font-medium">You have access</div>
          {show.status === "live" && show.stream_url ? (
            <video src={show.stream_url} controls className="w-full rounded" />
          ) : (
            <p className="text-sm text-muted-foreground">
              The stream will appear here when the show goes live.
            </p>
          )}
        </Card>
      ) : (
        <Card className="p-4 space-y-3 bg-card/40">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Pay-per-view ticket</div>
            <div className="text-lg font-bold">${price}</div>
          </div>
          <Button
            className="w-full min-h-[44px]"
            onClick={handleBuy}
            disabled={purchase.isPending || show.status === "ended" || show.status === "canceled"}
          >
            {purchase.isPending ? "Processing…" : `Buy ticket · $${price}`}
          </Button>
        </Card>
      )}
    </div>
  );
}
