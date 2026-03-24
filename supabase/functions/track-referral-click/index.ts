import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();
    if (!code) {
      return new Response(JSON.stringify({ error: "Missing code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Increment clicks on affiliate_links
    const { error } = await supabase.rpc("increment_affiliate_clicks", { ref_code: code });
    
    // Fallback: direct update if RPC doesn't exist
    if (error) {
      await supabase
        .from("affiliate_links")
        .update({ clicks: supabase.rpc ? undefined : 0 })
        .eq("code", code);
      
      // Manual increment
      const { data: link } = await supabase
        .from("affiliate_links")
        .select("clicks")
        .eq("code", code)
        .maybeSingle();
      
      if (link) {
        await supabase
          .from("affiliate_links")
          .update({ clicks: (link.clicks || 0) + 1 })
          .eq("code", code);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
