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

    const { giveaway_id } = await req.json();
    if (!giveaway_id) throw new Error("giveaway_id required");

    const { data: giveaway, error: gErr } = await supabase
      .from("live_giveaways")
      .select("*")
      .eq("id", giveaway_id)
      .single();
    if (gErr || !giveaway) throw new Error("Giveaway not found");
    if (giveaway.status !== "active") throw new Error("Giveaway already ended");

    // Get all entries
    const { data: entries } = await supabase
      .from("live_giveaway_entries")
      .select("*")
      .eq("giveaway_id", giveaway_id);

    let winnerId = null;
    let winnerUsername = null;

    if (entries && entries.length > 0) {
      // Random winner
      const winner = entries[Math.floor(Math.random() * entries.length)];
      winnerId = winner.user_id;
      winnerUsername = winner.username;
    }

    // Update giveaway
    await supabase.from("live_giveaways").update({
      status: "ended",
      winner_id: winnerId,
      winner_username: winnerUsername,
      ended_at: new Date().toISOString(),
    }).eq("id", giveaway_id);

    // Post winner to chat
    if (winnerId && winnerUsername) {
      await supabase.from("live_chat_messages").insert({
        stream_id: giveaway.stream_id,
        user_id: winnerId,
        username: winnerUsername,
        message: `🎉 just won the giveaway: "${giveaway.title}"!`,
        is_pinned: false,
      });

      // Notify winner
      await supabase.from("notifications").insert({
        user_id: winnerId,
        type: "giveaway_won",
        title: "🎉 You won a giveaway!",
        message: `You won "${giveaway.title}" during a live stream!`,
        link: `/stream/${giveaway.stream_id}`,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      winner_id: winnerId,
      winner_username: winnerUsername,
      total_entries: entries?.length || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("end-live-giveaway error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}));
