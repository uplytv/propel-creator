import { getCreatorPlatformFeeRate } from "../_shared/platformFees.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");

    const { auction_id } = await req.json();
    if (!auction_id) throw new Error("auction_id required");

    const { data: auction, error: aErr } = await supabase
      .from("live_auctions")
      .select("*")
      .eq("id", auction_id)
      .single();
    if (aErr || !auction) throw new Error("Auction not found");
    if (auction.status !== "active") throw new Error("Auction already ended");

    // End the auction
    await supabase.from("live_auctions").update({ status: "ended" }).eq("id", auction_id);
    await supabase.from("live_products").update({ is_active: false }).eq("id", auction.live_product_id);

    const { data: product } = await supabase
      .from("live_products")
      .select("title, stream_id")
      .eq("id", auction.live_product_id)
      .single();

    if (auction.current_winner_id && auction.current_bid > 0) {
      // Insert completed purchase for the winner
      const amount = auction.current_bid;
      const feeRate = await getCreatorPlatformFeeRate(supabase, auction.creator_id);
      const platformFee = parseFloat((amount * feeRate).toFixed(2));
      const creatorEarnings = parseFloat((amount * (1 - feeRate)).toFixed(2));

      await supabase.from("live_purchases").insert({
        live_product_id: auction.live_product_id,
        buyer_id: auction.current_winner_id,
        creator_id: auction.creator_id,
        amount,
        platform_fee: platformFee,
        creator_earnings: creatorEarnings,
        status: "completed",
      });

      // Notify winner
      await supabase.from("notifications").insert({
        user_id: auction.current_winner_id,
        type: "auction_won",
        title: "🏆 You won the auction!",
        message: `You won "${product?.title}" for $${amount}!`,
        link: `/stream/${auction.stream_id}`,
      });

      // Post chat message
      if (product) {
        await supabase.from("live_chat_messages").insert({
          stream_id: product.stream_id,
          user_id: auction.current_winner_id,
          username: auction.current_winner_username || "Winner",
          message: `🏆 won ${product.title} for $${amount}!`,
          is_pinned: false,
        });
      }

      return new Response(JSON.stringify({
        success: true,
        winner_id: auction.current_winner_id,
        winner_username: auction.current_winner_username,
        winning_bid: auction.current_bid,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No bids
    return new Response(JSON.stringify({ success: true, winner_id: null, message: "No bids placed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("end-live-auction error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
