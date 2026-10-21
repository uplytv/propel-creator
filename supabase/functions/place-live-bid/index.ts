import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(withCors(async (req) => {
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
    const userId = userData.user.id;

    const { live_product_id, bid_amount } = await req.json();
    if (!live_product_id || !bid_amount) throw new Error("live_product_id and bid_amount required");

    // Get auction
    const { data: auction, error: aErr } = await supabase
      .from("live_auctions")
      .select("*")
      .eq("live_product_id", live_product_id)
      .eq("status", "active")
      .single();
    if (aErr || !auction) throw new Error("No active auction found");

    // Validate bid
    const minBid = auction.current_bid > 0 ? auction.current_bid + 1 : auction.starting_bid;
    if (bid_amount < minBid) throw new Error(`Minimum bid is $${minBid}`);

    // Check auction not expired
    if (new Date(auction.ends_at) < new Date()) throw new Error("Auction has ended");

    // Get bidder profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("user_id", userId)
      .single();
    const username = profile?.display_name || profile?.username || "Bidder";

    // Set all previous bids as not winning
    await supabase.from("live_bids")
      .update({ is_winning: false })
      .eq("live_product_id", live_product_id);

    // Insert new bid
    await supabase.from("live_bids").insert({
      live_product_id,
      bidder_id: userId,
      amount: bid_amount,
      is_winning: true,
    });

    // Update auction
    await supabase.from("live_auctions").update({
      current_bid: bid_amount,
      current_winner_id: userId,
      current_winner_username: username,
      bid_count: auction.bid_count + 1,
    }).eq("id", auction.id);

    // Post chat message
    const { data: product } = await supabase
      .from("live_products")
      .select("title, stream_id")
      .eq("id", live_product_id)
      .single();

    if (product) {
      await supabase.from("live_chat_messages").insert({
        stream_id: product.stream_id,
        user_id: userId,
        username,
        message: `🔨 bid $${bid_amount} on ${product.title}!`,
        is_pinned: false,
      });
    }

    return new Response(JSON.stringify({ success: true, current_bid: bid_amount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("place-live-bid error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}));
