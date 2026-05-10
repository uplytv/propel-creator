import { useState, useMemo } from "react";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMerchVariants, type MerchProduct } from "../hooks/useMerchVariants";
import { toast } from "sonner";

const fmt = (cents: number, currency = "usd") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100,
  );

export function MerchProductCard({ product }: { product: MerchProduct }) {
  const { data: variants = [] } = useMerchVariants(product.id);
  const sizes = useMemo(() => Array.from(new Set(variants.map((v) => v.size).filter(Boolean))) as string[], [variants]);
  const colors = useMemo(() => Array.from(new Set(variants.map((v) => v.color).filter(Boolean))) as string[], [variants]);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);

  const selected = variants.find(
    (v) => (size ? v.size === size : true) && (color ? v.color === color : true),
  );
  const price = selected?.price_cents_override ?? product.price_cents;
  const inStock = selected ? selected.stock_count > 0 : product.in_stock;
  const lowStock = selected && selected.stock_count > 0 && selected.stock_count <= 5;

  const buy = () => {
    if (variants.length > 0 && !selected) {
      toast.error("Pick a size & color");
      return;
    }
    if (!inStock) {
      toast.error("Out of stock");
      return;
    }
    toast.success("Added to cart");
  };

  return (
    <article className="rounded-xl bg-card/40 border border-border/30 overflow-hidden">
      <div
        className="aspect-square w-full"
        style={{
          background: product.image_url
            ? `url(${product.image_url}) center/cover`
            : "linear-gradient(135deg, hsl(var(--muted)), hsl(var(--card)))",
        }}
      />
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{product.title}</div>
            <div className="text-xs text-muted-foreground">{fmt(price, product.currency)}</div>
          </div>
          {!inStock ? (
            <Badge variant="outline" className="text-[10px]">Sold out</Badge>
          ) : lowStock ? (
            <Badge className="text-[10px] bg-orange-500/20 text-orange-400 border-orange-500/30">
              Only {selected!.stock_count} left
            </Badge>
          ) : null}
        </div>

        {sizes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(size === s ? null : s)}
                className={`px-2 py-1 text-xs rounded border min-h-[44px] min-w-[44px] ${
                  size === s ? "bg-primary text-primary-foreground border-primary" : "border-border"
                }`}
                style={{ fontSize: 16 }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {colors.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(color === c ? null : c)}
                className={`px-2 py-1 text-xs rounded border min-h-[44px] ${
                  color === c ? "bg-primary text-primary-foreground border-primary" : "border-border"
                }`}
                style={{ fontSize: 16 }}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <Button onClick={buy} disabled={!inStock} className="w-full" size="sm">
          <ShoppingBag className="h-4 w-4 mr-1" />
          {inStock ? "Add to bag" : "Sold out"}
        </Button>
      </div>
    </article>
  );
}
