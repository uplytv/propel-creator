const corsHeaders = { "Access-Control-Allow-Origin": "https://uply.tv", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withCors } from "../_shared/security.ts";

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { member_id, creator_id } = await req.json();
    if (!member_id || !creator_id) return new Response(JSON.stringify({ error: "member_id and creator_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check for existing code
    const { data: existing } = await supabase.from("member_referral_codes").select("code").eq("member_id", member_id).eq("creator_id", creator_id).single();
    if (existing) return new Response(JSON.stringify({ code: existing.code }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get member username
    const { data: profile } = await supabase.from("profiles").select("username").eq("id", member_id).single();
    const prefix = (profile?.username || "UPLY").slice(0, 6).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    const code = `${prefix}-${random}`;

    const { error } = await supabase.from("member_referral_codes").insert({ member_id, creator_id, code });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ code }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}));
