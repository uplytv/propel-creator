import { ExternalLink, ShoppingBag } from 'lucide-react';
import { useArtistMerch } from '../hooks/useMusicMonetization';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function ArtistMerchShelf({ artistId }: { artistId: string }) {
  const { data: merch = [], isLoading } = useArtistMerch(artistId);

  if (isLoading) {
    return <div className="h-32 rounded-xl bg-muted/20 animate-pulse" />;
  }
  if (merch.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
        No merch yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {merch.map((m) => (
        <Card key={m.id} className="overflow-hidden bg-card/40 border-border/40">
          {m.image_url && (
            <div className="aspect-square bg-muted/20">
              <img src={m.image_url} alt={m.title} className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <div className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-sm line-clamp-2 flex-1">{m.title}</h4>
              <Badge variant="outline" className="text-[10px] shrink-0">{m.kind}</Badge>
            </div>
            <p className="text-primary font-bold text-sm">
              ${(m.price_cents / 100).toFixed(2)}
            </p>
            {m.external_url ? (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="w-full min-h-[44px] rounded-full"
              >
                <a href={m.external_url} target="_blank" rel="noreferrer">
                  Buy <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={!m.in_stock}
                className="w-full min-h-[44px] rounded-full"
              >
                {m.in_stock ? 'Buy' : 'Sold out'}
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
