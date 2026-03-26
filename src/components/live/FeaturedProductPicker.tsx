import { useState } from "react";
import { ShoppingBag, X, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Product {
  id: string;
  name: string;
  type: string;
  price: number;
  image_url?: string | null;
  status: string;
}

interface FeaturedProductPickerProps {
  products: Product[];
  featuredProductId?: string | null;
  onSelect?: (id: string | null) => void;
}

function ProductEmoji(type: string) {
  return type === 'course' ? '📚' : type === 'community' ? '🤝' : type === 'coaching' ? '🎯' : '📦';
}

export default function FeaturedProductPicker({
  products,
  featuredProductId,
  onSelect,
}: FeaturedProductPickerProps) {
  const selected = products.find((p) => p.id === featuredProductId);
  const [open, setOpen] = useState(false);

  const ProductList = ({ onPick }: { onPick: (id: string) => void }) => (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      {products.map((p) => (
        <button
          key={p.id}
          onClick={() => onPick(p.id)}
          className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors ${
            p.id === featuredProductId ? 'bg-primary/10' : 'hover:bg-secondary'
          }`}
        >
          {p.image_url ? (
            <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs">
              {ProductEmoji(p.type)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{p.type} · ${p.price}</p>
          </div>
        </button>
      ))}
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
            onClick={() => onSelect?.(null)}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {selected ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-all text-left">
              {selected.image_url ? (
                <img src={selected.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm">
                  {ProductEmoji(selected.type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{selected.name}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{selected.type} · ${selected.price}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <p className="text-xs font-semibold text-foreground px-2 py-1.5">Switch Product</p>
            <ProductList onPick={(id) => { onSelect?.(id); setOpen(false); }} />
          </PopoverContent>
        </Popover>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-lg border border-dashed border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-xs text-muted-foreground">
              <ShoppingBag className="w-3.5 h-3.5" />
              Select a product to feature
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <p className="text-xs font-semibold text-foreground px-2 py-1.5">Feature a Product</p>
            <ProductList onPick={(id) => { onSelect?.(id); setOpen(false); }} />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export type { Product };
