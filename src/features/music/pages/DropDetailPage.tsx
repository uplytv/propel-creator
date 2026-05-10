import { useParams } from "react-router-dom";
import { Loader2, Sparkles, Disc3 } from "lucide-react";
import { toast } from "sonner";
import { useDrop, useMyDropEdition, useClaimDropEdition } from "../hooks/useMusicDrops";
import { CollectorBadge } from "../components/CollectorBadge";

export default function DropDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: drop, isLoading } = useDrop(id);
  const { data: myEdition } = useMyDropEdition(id);
  const claim = useClaimDropEdition();

  const handleClaim = async () => {
    if (!id) return;
    try {
      const ed = await claim.mutateAsync(id);
      toast.success(`Edition #${ed.edition_number} claimed!`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not claim edition");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!drop) {
    return <div className="p-6 text-center text-muted-foreground">Drop not found.</div>;
  }

  const remaining = drop.edition_cap - drop.editions_sold;
  const soldOut = drop.status === "sold_out" || remaining <= 0;
  const pct = Math.min(100, Math.round((drop.editions_sold / Math.max(1, drop.edition_cap)) * 100));
  const price = drop.price_cents > 0 ? `$${(drop.price_cents / 100).toFixed(2)}` : "Free";

  return (
    <div className="mobile-safe-content max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="rounded-2xl overflow-hidden bg-card border border-border">
        <div className="relative aspect-square bg-muted">
          {drop.artwork_url ? (
            <img src={drop.artwork_url} alt={drop.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Disc3 className="w-20 h-20 text-muted-foreground/40" />
            </div>
          )}
          {myEdition && (
            <div className="absolute top-3 right-3">
              <CollectorBadge
                editionNumber={myEdition.edition_number}
                totalEditions={drop.edition_cap}
                size="md"
              />
            </div>
          )}
        </div>
        <div className="p-4 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{drop.title}</h1>
            {drop.description && (
              <p className="text-sm text-muted-foreground mt-1">{drop.description}</p>
            )}
          </div>

          {drop.audio_url && (
            <audio controls src={drop.audio_url} className="w-full" preload="none" />
          )}

          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{drop.editions_sold}/{drop.edition_cap} claimed</span>
              <span className="font-semibold text-foreground">{remaining} left</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {myEdition ? (
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">
                  You own edition #{myEdition.edition_number}
                </div>
                <div className="text-xs text-muted-foreground">
                  Claimed {new Date(myEdition.claimed_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ) : soldOut ? (
            <button
              disabled
              className="w-full py-3 rounded-full bg-muted text-muted-foreground font-semibold text-sm"
            >
              Sold Out
            </button>
          ) : (
            <button
              onClick={handleClaim}
              disabled={claim.isPending}
              className="w-full py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-60"
            >
              {claim.isPending ? "Claiming…" : `Claim edition · ${price}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
