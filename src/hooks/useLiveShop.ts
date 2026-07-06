import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface LiveProduct {
  id: string;
  stream_id: string;
  creator_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  additional_images: string[];
  price: number;
  quantity_total: number;
  quantity_remaining: number;
  stripe_price_id: string | null;
  is_active: boolean;
  is_sold_out: boolean;
  type: string;
  auction_duration_minutes: number | null;
  starting_bid: number | null;
  reserve_price: number | null;
  buy_now_price: number | null;
  position: number;
  condition: string;
  shipping_price: number;
  free_shipping: boolean;
  shopify_product_id: string | null;
  shopify_variant_id: string | null;
  shopify_checkout_url: string | null;
  sku: string | null;
  category: string | null;
  auto_end_auction: boolean;
  low_stock_alert_sent: boolean;
  ai_pitch: string | null;
  urgency_message: string | null;
  created_at: string;
}

export interface LiveAuction {
  id: string;
  live_product_id: string;
  stream_id: string;
  creator_id: string;
  starting_bid: number;
  current_bid: number;
  current_winner_id: string | null;
  current_winner_username: string | null;
  bid_count: number;
  ends_at: string;
  status: string;
  created_at: string;
}

export interface LiveGiveaway {
  id: string;
  stream_id: string;
  creator_id: string;
  title: string;
  entry_count: number;
  status: string;
  winner_id: string | null;
  winner_username: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface LiveFlashSale {
  id: string;
  live_product_id: string;
  discount_percent: number;
  original_price: number;
  sale_price: number;
  duration_seconds: number;
  ends_at: string;
  is_active: boolean;
}

export interface LiveProductVariant {
  id: string;
  live_product_id: string;
  label: string;
  options: string[];
}

export function useLiveShop(streamId: string | undefined) {
  const { user } = useAuth();

  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [auctions, setAuctions] = useState<LiveAuction[]>([]);
  const [giveaways, setGiveaways] = useState<LiveGiveaway[]>([]);
  const [flashSales, setFlashSales] = useState<LiveFlashSale[]>([]);
  const [variants, setVariants] = useState<LiveProductVariant[]>([]);
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());
  const [ownedProductIds, setOwnedProductIds] = useState<Set<string>>(new Set());
  const [giveawayEntered, setGiveawayEntered] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [unitsSold, setUnitsSold] = useState(0);

  useEffect(() => {
    if (!streamId) return;

    const fetchData = async () => {
      const [prodRes, auctionRes, giveRes, flashRes] = await Promise.all([
        supabase.from("live_products").select("*").eq("stream_id", streamId).order("position"),
        supabase.from("live_auctions").select("*").eq("stream_id", streamId),
        supabase.from("live_giveaways").select("*").eq("stream_id", streamId).order("created_at", { ascending: false }),
        supabase.from("live_flash_sales").select("*").eq("stream_id", streamId).eq("is_active", true),
      ]);

      if (prodRes.data) {
        // ppv_access is a virtual stream-access product — never show in shop UI
        const shopProducts = (prodRes.data as any[]).filter((p) => p.type !== "ppv_access");
        setProducts(shopProducts as unknown as LiveProduct[]);
        const productIds = shopProducts.map((p) => p.id);

        if (productIds.length > 0) {
          const { data: variantData } = await supabase
            .from("live_product_variants")
            .select("*")
            .in("live_product_id", productIds);
          if (variantData) setVariants(variantData as unknown as LiveProductVariant[]);
        }

        if (user && productIds.length > 0) {
          const { data: purchases } = await supabase
            .from("live_purchases")
            .select("amount, status")
            .eq("creator_id", user.id)
            .in("live_product_id", productIds);
          if (purchases) {
            const completed = (purchases as any[]).filter(p => p.status === "completed");
            setTotalRevenue(completed.reduce((s, p) => s + Number(p.amount), 0));
            setUnitsSold(completed.length);
          }

          // Viewer-side owned state: which of this stream's products has the
          // current user already bought (pending counts too — checkout started)
          const { data: myPurchases } = await supabase
            .from("live_purchases")
            .select("live_product_id, status")
            .eq("buyer_id", user.id)
            .in("live_product_id", productIds);
          if (myPurchases) {
            setOwnedProductIds(new Set(
              (myPurchases as any[])
                .filter(p => p.status === "completed")
                .map(p => p.live_product_id)
            ));
          }
        }
      }

      if (auctionRes.data) setAuctions(auctionRes.data as unknown as LiveAuction[]);
      if (giveRes.data) setGiveaways(giveRes.data as unknown as LiveGiveaway[]);
      if (flashRes.data) setFlashSales(flashRes.data as unknown as LiveFlashSale[]);

      if (user) {
        const { data: wishlist } = await supabase
          .from("live_product_wishlist")
          .select("live_product_id")
          .eq("user_id", user.id);
        if (wishlist) setWishlistedIds(new Set((wishlist as any[]).map(w => w.live_product_id)));
      }
    };

    fetchData();
  }, [streamId, user?.id]);

  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`live-shop-${streamId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_products", filter: `stream_id=eq.${streamId}` },
        (payload: any) => {
          if (payload.new?.type === "ppv_access") return; // virtual PPV product — not a shop item
          if (payload.eventType === "INSERT") setProducts(prev => prev.some(p => p.id === payload.new.id) ? prev : [...prev, payload.new as LiveProduct]);
          else if (payload.eventType === "UPDATE") setProducts(prev => prev.map(p => p.id === payload.new.id ? payload.new as LiveProduct : p));
          else if (payload.eventType === "DELETE") setProducts(prev => prev.filter(p => p.id !== payload.old.id));
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_auctions", filter: `stream_id=eq.${streamId}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") setAuctions(prev => [...prev, payload.new as LiveAuction]);
          else if (payload.eventType === "UPDATE") setAuctions(prev => prev.map(a => a.id === payload.new.id ? payload.new as LiveAuction : a));
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_giveaways", filter: `stream_id=eq.${streamId}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") setGiveaways(prev => [payload.new as LiveGiveaway, ...prev]);
          else if (payload.eventType === "UPDATE") setGiveaways(prev => prev.map(g => g.id === payload.new.id ? payload.new as LiveGiveaway : g));
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_flash_sales", filter: `stream_id=eq.${streamId}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") setFlashSales(prev => [...prev, payload.new as LiveFlashSale]);
          else if (payload.eventType === "UPDATE") setFlashSales(prev => prev.map(f => f.id === payload.new.id ? payload.new as LiveFlashSale : f));
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  // Realtime owned-state: the stripe-webhook flips live_purchases to
  // "completed" — reflect that instantly so items show as owned mid-stream.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`live-shop-purchases-${user.id}-${streamId || "none"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_purchases", filter: `buyer_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.new?.status === "completed" && payload.new?.live_product_id) {
            setOwnedProductIds(prev => {
              if (prev.has(payload.new.live_product_id)) return prev;
              const next = new Set(prev);
              next.add(payload.new.live_product_id);
              return next;
            });
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, streamId]);

  // Post-checkout return: Stripe sends the buyer back with ?purchase=success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchase") === "success") {
      toast.success("Purchase complete! 🎉", { description: "You're all set — the creator has been notified." });
      const url = new URL(window.location.href);
      url.searchParams.delete("purchase");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const activeProducts = products.filter(p => p.is_active && !p.is_sold_out);
  const queuedProducts = products.filter(p => !p.is_active && !p.is_sold_out);
  const soldProducts = products.filter(p => p.is_sold_out);
  const activeGiveaway = giveaways.find(g => g.status === "active");
  const activeFlashSales = flashSales.filter(f => f.is_active);

  const activateProduct = useCallback(async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    await supabase.from("live_products").update({ is_active: true }).eq("id", productId);
    if (product.type === "auction") {
      const durationMs = (product.auction_duration_minutes || 5) * 60 * 1000;
      await supabase.from("live_auctions").insert({
        live_product_id: productId,
        stream_id: streamId!,
        creator_id: product.creator_id,
        starting_bid: product.starting_bid || product.price,
        ends_at: new Date(Date.now() + durationMs).toISOString(),
      });
    }
    toast.success("Product activated!", { description: `${product.title} is now live` });
  }, [products, streamId]);

  const deactivateProduct = useCallback(async (productId: string) => {
    await supabase.from("live_products").update({ is_active: false }).eq("id", productId);
    const auction = auctions.find(a => a.live_product_id === productId && a.status === "active");
    if (auction) {
      await supabase.functions.invoke("end-live-auction", { body: { auction_id: auction.id } });
    }
  }, [auctions]);

  const placeBid = useCallback(async (productId: string, amount: number) => {
    const { data, error } = await supabase.functions.invoke("place-live-bid", {
      body: { live_product_id: productId, bid_amount: amount },
    });
    if (error || data?.error) {
      toast.error("Bid failed", { description: data?.error || error?.message });
      return false;
    }
    toast.success(`Bid of $${amount} placed!`);
    return true;
  }, []);

  const buyProduct = useCallback(async (productId: string, variantSelected?: string, buyerMessage?: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.shopify_checkout_url) {
      window.open(product.shopify_checkout_url, "_blank");
      return;
    }

    const { data, error } = await supabase.functions.invoke("stripe-create-live-purchase", {
      body: {
        live_product_id: productId,
        variant_selected: variantSelected || null,
        buyer_message: buyerMessage || null,
        return_url: window.location.href,
      },
    });
    if (error || data?.error) {
      toast.error("Purchase failed", { description: data?.error || error?.message });
      return;
    }
    if (data?.url) {
      toast("Checkout opened in a new tab", { description: "Come back here after paying — your purchase will appear automatically." });
      window.open(data.url, "_blank");
    }
  }, [products]);

  const startGiveaway = useCallback(async (title: string) => {
    if (!streamId || !user) return;
    await supabase.from("live_giveaways").insert({ stream_id: streamId, creator_id: user.id, title });
    toast.success("Giveaway started!", { description: `"${title}" is now live` });
  }, [streamId, user]);

  const endGiveaway = useCallback(async (giveawayId: string) => {
    const { data, error } = await supabase.functions.invoke("end-live-giveaway", { body: { giveaway_id: giveawayId } });
    if (data?.winner_username) {
      toast.success("🎉 Winner!", { description: `${data.winner_username} won!` });
    } else {
      toast("Giveaway ended", { description: "No entries were submitted." });
    }
    return data;
  }, []);

  const enterGiveaway = useCallback(async (giveawayId: string) => {
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
    const { error } = await supabase.from("live_giveaway_entries").insert({
      giveaway_id: giveawayId,
      user_id: user.id,
      username: (profile as any)?.display_name || "Anonymous",
    });
    if (error) {
      if (error.code === "23505") toast("Already entered!");
      else toast.error("Error", { description: error.message });
      return;
    }
    const giveaway = giveaways.find(g => g.id === giveawayId);
    if (giveaway) {
      await supabase.from("live_giveaways").update({ entry_count: giveaway.entry_count + 1 }).eq("id", giveawayId);
    }
    setGiveawayEntered(true);
    toast.success("🎁 Entered! Good luck!");
  }, [user, giveaways]);

  const toggleWishlist = useCallback(async (productId: string) => {
    if (!user) { toast.error("Sign in to save products"); return; }
    const isWishlisted = wishlistedIds.has(productId);
    if (isWishlisted) {
      await supabase.from("live_product_wishlist").delete().eq("live_product_id", productId).eq("user_id", user.id);
      setWishlistedIds(prev => { const n = new Set(prev); n.delete(productId); return n; });
    } else {
      await supabase.from("live_product_wishlist").insert({ live_product_id: productId, user_id: user.id });
      setWishlistedIds(prev => new Set([...prev, productId]));
    }
  }, [user, wishlistedIds]);

  const startFlashSale = useCallback(async (productId: string, discountPercent: number, durationSeconds: number) => {
    const product = products.find(p => p.id === productId);
    if (!product || !user || !streamId) return;
    const salePrice = parseFloat((product.price * (1 - discountPercent / 100)).toFixed(2));
    const { error } = await supabase.from("live_flash_sales").insert({
      live_product_id: productId,
      stream_id: streamId,
      creator_id: user.id,
      discount_percent: discountPercent,
      original_price: product.price,
      sale_price: salePrice,
      duration_seconds: durationSeconds,
      ends_at: new Date(Date.now() + durationSeconds * 1000).toISOString(),
    });
    if (error) { toast.error("Flash sale failed", { description: error.message }); return; }
    toast.success("⚡ Flash sale started!", { description: `${discountPercent}% off for ${durationSeconds < 60 ? durationSeconds + "s" : Math.round(durationSeconds / 60) + "m"}` });
  }, [products, user, streamId]);

  const getVariantsForProduct = useCallback((productId: string): LiveProductVariant[] => {
    return variants.filter(v => v.live_product_id === productId);
  }, [variants]);

  // Competitive advantage: low stock alert — fire chat message when qty drops to 3
  useEffect(() => {
    if (!streamId) return;
    const lowStockProducts = activeProducts.filter(
      p => p.quantity_remaining <= 3 && p.quantity_remaining > 0 && !p.low_stock_alert_sent
    );
    const sendAlerts = async () => {
      for (const p of lowStockProducts) {
        try {
          await (supabase as any).from("live_chat_messages").insert({
            stream_id: streamId, user_id: p.creator_id,
            username: "UPLY Shop",
            message: `🔥 Only ${p.quantity_remaining} left of "${p.title}"!`,
            is_pinned: false,
          });
          await (supabase as any).from("live_products").update({ low_stock_alert_sent: true }).eq("id", p.id);
        } catch { /* best effort */ }
      }
    };
    if (lowStockProducts.length > 0) sendAlerts();
  }, [activeProducts.map(p => `${p.id}:${p.quantity_remaining}:${p.low_stock_alert_sent}`).join(","), streamId]);

  return {
    products, activeProducts, queuedProducts, soldProducts,
    auctions, giveaways, activeGiveaway,
    flashSales, activeFlashSales,
    variants, wishlistedIds, ownedProductIds,
    giveawayEntered, totalRevenue, unitsSold,
    activateProduct, deactivateProduct,
    placeBid, buyProduct,
    startGiveaway, endGiveaway, enterGiveaway,
    toggleWishlist, startFlashSale, getVariantsForProduct,
  };
}
