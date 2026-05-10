import { ShoppingBag } from "lucide-react";
import { useConcertMerch } from "../hooks/useConcertMerch";

export function ConcertMerchCarousel({ concertId }: { concertId: string }) {
  const { data: items = [] } = useConcertMerch(concertId);
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <ShoppingBag className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Show Merch</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
        {items.map((m) => (
          <a
            key={m.id}
            href={m.external_url ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="snap-start shrink-0 w-32 rounded-xl bg-card border border-border overflow-hidden"
          >
            <div className="aspect-square bg-muted">
              {m.image_url && <img src={m.image_url} alt={m.title} className="w-full h-full object-cover" loading="lazy" />}
            </div>
            <div className="p-2">
              <p className="text-xs font-medium line-clamp-1">{m.title}</p>
              <p className="text-xs text-primary font-semibold">${(m.price_cents / 100).toFixed(2)}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
