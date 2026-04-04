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
  price: number;
  quantity_total: number;
  quantity_remaining: number;
  stripe_price_id: string | null;
  is_active: boolean;
  is_sold_out: boolean;
  type: string;
  auction_duration_minutes: number | null;
  starting_bid: number | null;
  position: number;
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

export function useLiveShop(streamId: string | undefined) {
  const { user } = useAuth();
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [auctions, setAuctions] = useState<LiveAuction[]>([]);
  const [giveaways, setGiveaways] = useState<LiveGiveaway[]>([]);
  const [giveawayEntered, setGiveawayEntered] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [unitsSold, setUnitsSold] = useState(0);

  // Fetch initial data
  useEffect(() => {
    if (!streamId) return;

    const fetchData = async () => {
      const [prodRes, auctionRes, giveRes] = await Promise.all([
        supabase.from("live_products").select("*").eq("stream_id", streamId).order("position"),
        supabase.from("live_auctions").select("*").eq("stream_id", streamId),
        supabase.from("live_giveaways").select("*").eq("stream_id", streamId).order("created_at", { ascending: false }),
      ]);
      if (prodRes.data) setProducts(prodRes.data as any);
      if (auctionRes.data) setAuctions(auctionRes.data as any);
      if (giveRes.data) setGiveaways(giveRes.data as any);

      // Fetch revenue stats
      const { data: purchases } = await supabase
        .from("live_purchases")
        .select("amount, status")
        .eq("creator_id", user?.id || "")
        .in("live_product_id", (prodRes.data || []).map((p: any) => p.id));
      if (purchases) {
        const completed = purchases.filter(p => p.status === "completed");
        setTotalRevenue(completed.reduce((s, p) => s + Number(p.amount), 0));
        setUnitsSold(completed.length);
      }
    };
    fetchData();
  }, [streamId, user?.id]);

  // Realtime subscriptions
  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`live-shop-${streamId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_products", filter: `stream_id=eq.${streamId}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") setProducts(prev => [...prev, payload.new]);
          else if (payload.eventType === "UPDATE") setProducts(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
          else if (payload.eventType === "DELETE") setProducts(prev => prev.filter(p => p.id !== payload.old.id));
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_auctions", filter: `stream_id=eq.${streamId}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") setAuctions(prev => [...prev, payload.new]);
          else if (payload.eventType === "UPDATE") setAuctions(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_giveaways", filter: `stream_id=eq.${streamId}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") setGiveaways(prev => [payload.new, ...prev]);
          else if (payload.eventType === "UPDATE") setGiveaways(prev => prev.map(g => g.id === payload.new.id ? payload.new : g));
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [streamId]);

  const activeProducts = products.filter(p => p.is_active && !p.is_sold_out);
  const queuedProducts = products.filter(p => !p.is_active);
  const activeGiveaway = giveaways.find(g => g.status === "active");

  const activateProduct = useCallback(async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    await supabase.from("live_products").update({ is_active: true }).eq("id", productId);

    // If auction type, create auction record
    if (product.type === "auction") {
      const durationMs = (product.auction_duration_minutes || 5) * 60 * 1000;
      const endsAt = new Date(Date.now() + durationMs).toISOString();
      await supabase.from("live_auctions").insert({
        live_product_id: productId,
        stream_id: streamId!,
        creator_id: product.creator_id,
        starting_bid: product.starting_bid || product.price,
        ends_at: endsAt,
      });
    }

    toast.success("Product activated!", { description: `${product.title });
  }, [products, streamId, toast]);

  const deactivateProduct = useCallback(async (productId: string) => {
    await supabase.from("live_products").update({ is_active: false }).eq("id", productId);

    // End related auction
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
    toast.success("Bid placed!", { description: `Your bid of $${amount} was submitted` });
    return true;
  }, [toast]);

  const buyProduct = useCallback(async (productId: string) => {
    const { data, error } = await supabase.functions.invoke("stripe-create-live-purchase", {
      body: { live_product_id: productId },
    });
    if (error || data?.error) {
      toast.error("Purchase failed", { description: data?.error || error?.message });
      return;
    }
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  }, [toast]);

  const startGiveaway = useCallback(async (title: string) => {
    if (!streamId || !user) return;
    await supabase.from("live_giveaways").insert({
      stream_id: streamId,
      creator_id: user.id,
      title,
    });
    toast.success("Giveaway started!", { description: `"${title });
  }, [streamId, user, toast]);

  const endGiveaway = useCallback(async (giveawayId: string) => {
    const { data, error } = await supabase.functions.invoke("end-live-giveaway", {
      body: { giveaway_id: giveawayId },
    });
    if (data?.winner_username) {
      toast.success("🎉 Winner!", { description: `${data.winner_username });
    } else {
      toast.success("Giveaway ended", { description: "No entries were submitted." });
    }
    return data;
  }, [toast]);

  const enterGiveaway = useCallback(async (giveawayId: string) => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    const { error } = await supabase.from("live_giveaway_entries").insert({
      giveaway_id: giveawayId,
      user_id: user.id,
      username: profile?.display_name || "Anonymous",
    });

    if (error) {
      if (error.code === "23505") {
        toast.success("Already entered!", { description: "You've already entered this giveaway." });
      } else {
        toast.error("Error", { description: error.message });
      }
      return;
    }

    // Increment entry count
    const giveaway = giveaways.find(g => g.id === giveawayId);
    if (giveaway) {
      await supabase.from("live_giveaways").update({
        entry_count: giveaway.entry_count + 1,
      }).eq("id", giveawayId);
    }

    setGiveawayEntered(true);
    toast.success("🎁 Entered!", { description: "You're in the giveaway! Good luck!" });
  }, [user, giveaways, toast]);

  return {
    products,
    activeProducts,
    queuedProducts,
    auctions,
    giveaways,
    activeGiveaway,
    giveawayEntered,
    totalRevenue,
    unitsSold,
    activateProduct,
    deactivateProduct,
    placeBid,
    buyProduct,
    startGiveaway,
    endGiveaway,
    enterGiveaway,
  };
}
