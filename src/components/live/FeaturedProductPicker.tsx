import { useMemo, useState } from "react";
import { ShoppingBag, X, ChevronDown, Search, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  type: string;
  price: number;
  image_url?: string | null;
  status: string;
  source?: "digital" | "live_shop";
}

interface FeaturedProductPickerProps {
  products: Product[];
  featuredProductId?: string | null;
  onSelect?: (id: string | null) => void;
}

function ProductEmoji(type: string) {
  return type === 'course' ? '📚' : type === 'community' ? '🤝' : type === 'coaching' ? '🎯' : type === 'auction' ? '🔨' : type === 'product' || type === 'shop' ? '🛍️' : '📦';
}

function formatPrice(price: number) {
  return Number.isInteger(price) ? price.toString() : price.toFixed(2);
}

export default function FeaturedProductPicker({
  products,
  featuredProductId,
  onSelect,
}: FeaturedProductPickerProps) {
  const selected = products.find((p) => p.id === featuredProductId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return products;

    return products.filter((product) => {
      const sourceLabel = product.source === "live_shop" ? "shop" : "digital";

      return [product.name, product.type, sourceLabel, formatPrice(product.price)]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [products, query]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  };

  const ProductList = ({ onPick }: { onPick: (id: string) => void }) => (
    <div className="space-y-1 mobile-popover-scroll overflow-y-auto p-2 scroll-feed">
      {filteredProducts.length === 0 ? (
        <p className="px-2 py-6 text-center text-xs text-muted-foreground">No products match your search.</p>
      ) : (
        filteredProducts.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.id)}
            className={cn(
              "w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors",
              p.id === featuredProductId ? "bg-primary/10" : "hover:bg-secondary",
            )}
          >
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} loading="lazy" className="w-8 h-8 rounded object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs">
                {ProductEmoji(p.type)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">
                {p.type} · ${formatPrice(p.price)}
                {p.source === "live_shop" && (
                  <span className="ml-1 text-primary font-semibold">· Shop</span>
                )}
              </p>
            </div>
            {p.id === featuredProductId && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
          </button>
        ))
      )}
    </div>
  );

  return (
    <div className="glass-card p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <ShoppingBag className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Featured Product</span>
        </div>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect?.(null)}
            aria-label="Clear featured product"
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {selected ? (
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button type="button" className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-all text-left">
              {selected.image_url ? (
                <img src={selected.image_url} alt={selected.name} loading="lazy" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm">
                  {ProductEmoji(selected.type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{selected.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {selected.type} · ${formatPrice(selected.price)}
                  {selected.source === "live_shop" && <span className="ml-1 text-primary font-semibold">· Shop</span>}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] max-w-sm p-0" align="start" collisionPadding={{ top: 16, bottom: 96, left: 16, right: 16 }}>
            <div className="border-b border-border px-3 py-2.5 space-y-2">
              <p className="text-xs font-semibold text-foreground">Switch Product</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  autoFocus
                />
              </div>
            </div>
            <ProductList onPick={(id) => { onSelect?.(id); setOpen(false); }} />
          </PopoverContent>
        </Popover>
      ) : (
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button type="button" className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-lg border border-dashed border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-xs text-muted-foreground">
              <ShoppingBag className="w-3.5 h-3.5" />
              Select a product to feature
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] max-w-sm p-0" align="start" collisionPadding={{ top: 16, bottom: 96, left: 16, right: 16 }}>
            <div className="border-b border-border px-3 py-2.5 space-y-2">
              <p className="text-xs font-semibold text-foreground">Feature a Product</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  autoFocus
                />
              </div>
            </div>
            <ProductList onPick={(id) => { onSelect?.(id); setOpen(false); }} />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export type { Product };
