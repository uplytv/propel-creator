import { useState } from "react";
import { Crown, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEncoreBids, usePlaceEncoreBid } from "../hooks/useEncoreBids";
import { toast } from "sonner";

export function EncoreBidPanel({ concertId }: { concertId: string }) {
  const { data: bids = [] } = useEncoreBids(concertId);
  const placeBid = usePlaceEncoreBid();
  const [song, setSong] = useState("");
  const [amount, setAmount] = useState("5");

  const submit = async () => {
    if (!song.trim()) return;
    const cents = Math.round(parseFloat(amount || "0") * 100);
    if (cents <= 0) return;
    try {
      await placeBid.mutateAsync({ concert_id: concertId, song_title: song.trim(), bid_cents: cents });
      setSong("");
      toast.success("Encore bid placed!");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to bid");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Bid on the Encore</h3>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Song title"
          value={song}
          onChange={(e) => setSong(e.target.value)}
          className="flex-1"
        />
        <Input
          type="number"
          min="1"
          step="0.5"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-20"
        />
        <Button onClick={submit} disabled={placeBid.isPending}>Bid</Button>
      </div>

      <div className="space-y-2">
        {bids.slice(0, 8).map((b, i) => (
          <div key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
              <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm">{b.song_title}</span>
            </div>
            <span className="text-sm font-semibold text-primary">${(b.bid_cents / 100).toFixed(2)}</span>
          </div>
        ))}
        {bids.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Be the first to bid for the encore.</p>
        )}
      </div>
    </div>
  );
}
