import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMyRoyaltyPayouts } from "../hooks/useRoyalties";
import { DollarSign } from "lucide-react";

export default function RoyaltyPayoutsPage() {
  const { data = [], isLoading } = useMyRoyaltyPayouts();

  const total = data.reduce((s, p) => s + p.amount_cents, 0);
  const pending = data.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount_cents, 0);
  const paid = data.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_cents, 0);

  return (
    <div className="min-h-screen bg-background mobile-safe-content max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-2xl font-display font-bold">My royalty payouts</h1>

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Lifetime</p>
          <p className="text-lg font-bold text-primary">${(total / 100).toFixed(2)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-lg font-bold">${(pending / 100).toFixed(2)}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-lg font-bold">${(paid / 100).toFixed(2)}</p>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No royalty payouts yet.</p>
      ) : (
        <div className="space-y-2">
          {data.map((p) => (
            <Card key={p.id} className="p-3 flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">${(p.amount_cents / 100).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  {p.music_royalty_events?.source ?? "—"} ·{" "}
                  {p.music_royalty_events?.occurred_at
                    ? new Date(p.music_royalty_events.occurred_at).toLocaleDateString()
                    : ""}
                </p>
              </div>
              <Badge variant={p.status === "paid" ? "default" : "outline"} className="capitalize">
                {p.status}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
