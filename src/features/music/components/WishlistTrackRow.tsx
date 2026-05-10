import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Star, X } from "lucide-react";
import { useRemoveFromWishlist, useUpdateWishlistPriority, type WishlistItem } from "../hooks/useTrackWishlist";

interface Props {
  item: WishlistItem;
}

export function WishlistTrackRow({ item }: Props) {
  const remove = useRemoveFromWishlist();
  const update = useUpdateWishlistPriority();

  return (
    <Card className="bg-card/40 border-border/50">
      <CardContent className="flex items-center gap-3 p-3">
        <Heart className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate font-mono">
            {item.track_id.slice(0, 12)}…
          </div>
          {item.note && (
            <div className="text-xs text-muted-foreground truncate">{item.note}</div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((p) => (
            <button
              key={p}
              onClick={() => update.mutate({ id: item.id, priority: p })}
              className="min-w-[28px] min-h-[28px] flex items-center justify-center"
              aria-label={`Set priority ${p}`}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  p <= item.priority ? "fill-primary text-primary" : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="min-w-[44px] min-h-[44px]"
          onClick={() => remove.mutate(item.id)}
          aria-label="Remove from wishlist"
        >
          <X className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
