import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  source_content_type: string | null;
  source_content_id: string | null;
  product?: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    type: string;
    user_id: string;
    stripe_price_id: string | null;
  };
}

export function useCart() {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("cart_items")
      .select("*, product:product_id(id, name, price, image_url, type, user_id, stripe_price_id)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data as CartItem[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`cart-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cart_items", filter: `user_id=eq.${user.id}` },
        () => fetchCart()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, fetchCart]);

  const addToCart = useCallback(
    async (productId: string, source?: { type: string; id: string }) => {
      if (!user) {
        toast.error("Sign in to add to cart");
        return;
      }
      // Upsert quantity
      const existing = items.find((i) => i.product_id === productId);
      if (existing) {
        await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + 1 })
          .eq("id", existing.id);
      } else {
        await supabase.from("cart_items").insert({
          user_id: user.id,
          product_id: productId,
          quantity: 1,
          source_content_type: source?.type ?? null,
          source_content_id: source?.id ?? null,
        });
      }
      toast.success("Added to cart");
    },
    [user, items]
  );

  const updateQuantity = useCallback(async (id: string, quantity: number) => {
    if (quantity < 1) return removeItem(id);
    await supabase.from("cart_items").update({ quantity }).eq("id", id);
  }, []);

  const removeItem = useCallback(async (id: string) => {
    await supabase.from("cart_items").delete().eq("id", id);
  }, []);

  const clearCart = useCallback(async () => {
    if (!user) return;
    await supabase.from("cart_items").delete().eq("user_id", user.id);
  }, [user]);

  const subtotal = items.reduce((sum, i) => sum + (i.product?.price ?? 0) * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, loading, itemCount, subtotal, addToCart, updateQuantity, removeItem, clearCart, refetch: fetchCart };
}
