import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get the user from the auth header
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const type = body.type || "platform"; // "platform" or "creator"
    const programId = body.program_id || null;

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    if (type === "platform") {
      // Check if user already has a platform affiliate link
      const { data: existing } = await serviceClient
        .from("affiliate_links")
        .select("id, code")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ code: existing.code, id: existing.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get display name for code generation
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const username = (profile?.display_name || "user")
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 12)
        .toUpperCase();
      const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `UPLY-${username}-${randomChars}`;

      const { data: newLink, error: insertError } = await serviceClient
        .from("affiliate_links")
        .insert({ user_id: user.id, code })
        .select("id, code")
        .single();

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ code: newLink.code, id: newLink.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (type === "creator" && programId) {
      // Check if member already has a code for this program
      const { data: existing } = await serviceClient
        .from("creator_affiliate_members")
        .select("id, affiliate_code")
        .eq("program_id", programId)
        .eq("member_id", user.id)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ code: existing.affiliate_code, id: existing.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: profile } = await serviceClient
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const username = (profile?.display_name || "member")
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 10)
        .toUpperCase();
      const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `${username}-${randomChars}`;

      const { data: newMember, error: insertError } = await serviceClient
        .from("creator_affiliate_members")
        .insert({ program_id: programId, member_id: user.id, affiliate_code: code })
        .select("id, affiliate_code")
        .single();

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ code: newMember.affiliate_code, id: newMember.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid type" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}));
