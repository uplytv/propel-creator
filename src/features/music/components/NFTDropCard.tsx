import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import type { NFTDrop } from "../hooks/useNFTDrops";

interface Props {
  drop: NFTDrop;
  onMint?: (drop: NFTDrop) => void;
  minting?: boolean;
}

export function NFTDropCard({ drop, onMint, minting }: Props) {
  const remaining = drop.edition_size - drop.minted_count;
  const soldOut = remaining <= 0 || drop.status === "sold_out";
  const price = (drop.price_cents / 100).toFixed(2);

  return (
    <Card className="overflow-hidden">
      {drop.artwork_url ? (
        <img src={drop.artwork_url} alt={drop.title} className="w-full aspect-square object-cover" />
      ) : (
        <div className="w-full aspect-square bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold truncate">{drop.title}</h3>
          <Badge variant={soldOut ? "secondary" : "default"}>{soldOut ? "Sold out" : drop.status}</Badge>
        </div>
        {drop.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{drop.description}</p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{drop.minted_count}/{drop.edition_size} minted</span>
          <span className="uppercase">{drop.chain}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-bold">${price}</span>
          {onMint && (
            <Button size="sm" onClick={() => onMint(drop)} disabled={soldOut || minting}>
              {soldOut ? "Sold out" : minting ? "Minting..." : `Mint #${drop.minted_count + 1}`}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
