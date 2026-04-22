import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, Plus, Loader2 } from "lucide-react";
import { useCartContext } from "@/context/CartContext";
import { Link } from "react-router-dom";

interface Props {
  productId: string;
  contentType?: string;
  contentId?: string;
  /** Render style: pill (default, compact CTA) or card (bottom sheet preview) */
  variant?: "pill" | "card";
  className?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  type: string;
}

/**
 * Tap-to-buy overlay shown over shoppable video content (clips, shorts, streams).
 * Reuses the existing Stripe product checkout via cart.
 */
export default function ShopProductOverlay({ productId, contentType, contentId, variant = "card", className = "" }: Props) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const { addToCart, openDrawer } = useCartContext();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase
      .from("products")
      .select("id, name, price, image_url, type")
      .eq("id", productId)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted) {
          setProduct(data as Product | null);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [productId]);

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product) return;
    setAdding(true);
    await addToCart(product.id, contentType && contentId ? { type: contentType, id: contentId } : undefined);
    setAdding(false);
    openDrawer();
  };

  if (loading) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white ${className}`}>
        <Loader2 className="w-3 h-3 animate-spin" /> Loading…
      </div>
    );
  }

  if (!product) return null;

  if (variant === "pill") {
    return (
      <button
        onClick={handleAdd}
        disabled={adding}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg ${className}`}
      >
        <ShoppingBag className="w-3.5 h-3.5" />
        ${product.price.toFixed(2)}
        <span className="opacity-80">· Add</span>
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 ${className}`}>
      <div className="w-12 h-12 rounded-lg bg-white/10 overflow-hidden shrink-0">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-white/60">
            <ShoppingBag className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <Link
          to={`/products?focus=${product.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-semibold text-white truncate block hover:underline"
        >
          {product.name}
        </Link>
        <p className="text-xs text-white/70">${product.price.toFixed(2)}</p>
      </div>
      <button
        onClick={handleAdd}
        disabled={adding}
        aria-label="Add to cart"
        className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg disabled:opacity-60"
      >
        {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        Add
      </button>
    </div>
  );
}
