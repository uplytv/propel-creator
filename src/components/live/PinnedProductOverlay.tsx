import { useState, useEffect } from "react";
import { X, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface PinnedProduct {
  id: string;
  title: string;
  price: number;
  image_url?: string | null;
  stripe_price_id?: string | null;
}

interface PinnedProductOverlayProps {
  streamId: string;
}

export default function PinnedProductOverlay({ streamId }: PinnedProductOverlayProps) {
  const [product, setProduct] = useState<PinnedProduct | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Fetch initial pinned product
    const fetchPinned = async () => {
      const { data } = await supabase
        .from("live_products")
        .select("id, title, price, image_url, stripe_price_id")
        .eq("stream_id", streamId)
        .eq("is_pinned", true)
        .maybeSingle();
      if (data) {
        setProduct(data as PinnedProduct);
        setDismissed(false);
        // Track impression
        supabase.from("live_products").update({ impression_count: (data as any).impression_count + 1 }).eq("id", data.id).then(() => {});
      }
    };
    fetchPinned();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`pinned-product-${streamId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "live_products",
        filter: `stream_id=eq.${streamId}`,
      }, (payload: any) => {
        const row = payload.new;
        if (row?.is_pinned) {
          setProduct({ id: row.id, title: row.title, price: row.price, image_url: row.image_url, stripe_price_id: row.stripe_price_id });
          setDismissed(false);
        } else if (payload.old?.is_pinned && !row?.is_pinned) {
          setProduct(null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  const handleCTA = async () => {
    if (!product) return;
    await supabase.from("live_products").update({ click_count: 1 }).eq("id", product.id);
  };

  return (
    <AnimatePresence>
      {product && !dismissed && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute bottom-4 left-4 right-4 z-20 rounded-xl p-3.5"
          style={{
            backgroundColor: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(61, 124, 255,0.3)",
          }}
        >
          <button onClick={() => setDismissed(true)} className="absolute top-2 right-2 text-white/50 hover:text-white">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            {product.image_url ? (
              <img src={product.image_url} alt={product.title} className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{product.title}</p>
              <p className="text-sm font-bold text-primary">${product.price}</p>
            </div>
            <Button size="sm" onClick={handleCTA} className="shrink-0">
              Get It Now →
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
