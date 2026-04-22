import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartContext } from "@/context/CartContext";
import { Minus, Plus, Trash2, ShoppingBag, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function CartDrawer() {
  const { items, drawerOpen, closeDrawer, updateQuantity, removeItem, subtotal, itemCount } = useCartContext();
  const [checkingOut, setCheckingOut] = useState(false);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setCheckingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-cart-checkout", {
        body: {
          items: items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
          })),
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Checkout did not return a URL");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not start checkout");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <Sheet open={drawerOpen} onOpenChange={(open) => (open ? null : closeDrawer())}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" /> Your Cart
            {itemCount > 0 && <span className="text-xs text-muted-foreground">({itemCount})</span>}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-12">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Your cart is empty</p>
              <p className="text-xs text-muted-foreground/70">Tap any product in a clip or stream to add it.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 p-3 rounded-xl bg-card border border-border">
                  <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                    {item.product?.image_url ? (
                      <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-muted-foreground">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product?.name ?? "Product"}</p>
                    <p className="text-sm font-bold text-primary mt-0.5">
                      ${((item.product?.price ?? 0) * item.quantity).toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 grid place-items-center"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 grid place-items-center"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove from cart"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-lg font-bold">${subtotal.toFixed(2)}</span>
            </div>
            <Button onClick={handleCheckout} disabled={checkingOut} className="w-full h-11 text-sm font-bold rounded-full">
              {checkingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : `Checkout · $${subtotal.toFixed(2)}`}
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">Secure checkout via Stripe</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
