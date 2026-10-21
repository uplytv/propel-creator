import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user from JWT - if not authenticated, return silently
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ tracked: false, reason: "unauthenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ tracked: false, reason: "unauthenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { asset_type, asset_id } = await req.json();
    if (!asset_type || !asset_id) {
      return new Response(JSON.stringify({ tracked: false, reason: "missing params" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Check if already viewed in last 24h
    const { data: existing } = await supabase
      .from("views_log")
      .select("id")
      .eq("user_id", user.id)
      .eq("asset_id", asset_id)
      .gte("viewed_at", twentyFourHoursAgo)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ tracked: false, reason: "already_viewed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert view log
    await supabase.from("views_log").insert({
      user_id: user.id,
      asset_id,
      asset_type,
    });

    // Increment view count on the appropriate table
    const tableMap: Record<string, string> = {
      video: "videos",
      clip: "clips",
      recording: "stream_recordings",
      mux_asset: "mux_assets",
    };

    const table = tableMap[asset_type];
    if (table) {
      // Use RPC or raw increment
      const { data: current } = await supabase
        .from(table)
        .select("view_count")
        .eq("id", asset_id)
        .single();

      if (current) {
        await supabase
          .from(table)
          .update({ view_count: (current.view_count || 0) + 1 })
          .eq("id", asset_id);
      }
    }

    return new Response(JSON.stringify({ tracked: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ tracked: false, error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
