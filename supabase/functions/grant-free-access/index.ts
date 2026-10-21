import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Not authenticated");

    const { resource_type, resource_id, source = "free_join" } = await req.json();

    if (!resource_type || !resource_id) {
      throw new Error("resource_type and resource_id required");
    }

    // AuthZ: only allow self-grant for resources that are actually free.
    let isFree = false;
    if (resource_type === "event") {
      const { data } = await supabaseAdmin.from("events").select("is_free, ticket_price").eq("id", resource_id).maybeSingle();
      isFree = !!(data?.is_free || (data && Number(data.ticket_price) === 0));
    } else if (resource_type === "space" || resource_type === "community") {
      const { data } = await supabaseAdmin.from("creator_spaces").select("is_free, price").eq("id", resource_id).maybeSingle();
      isFree = !!(data?.is_free || (data && Number(data.price) === 0));
    } else if (resource_type === "product") {
      const { data } = await supabaseAdmin.from("products").select("price").eq("id", resource_id).maybeSingle();
      isFree = !!(data && Number(data.price) === 0);
    } else if (resource_type === "stream") {
      // Public streams are openly viewable; only allow grant on streams marked public
      const { data } = await supabaseAdmin.from("mux_live_streams").select("is_public").eq("id", resource_id).maybeSingle();
      isFree = !!data?.is_public;
    }

    if (!isFree) {
      return new Response(JSON.stringify({ error: "Resource is not free" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Insert access grant using service role (bypasses RLS)
    const { error: insertError } = await supabaseAdmin
      .from("access_grants")
      .insert({
        user_id: user.id,
        resource_type,
        resource_id,
        access_level: "full",
        source,
        expires_at: null,
      });

    // Unique constraint violation means already granted — treat as success
    if (insertError && !insertError.message?.includes("duplicate") && !insertError.message?.includes("unique")) {
      throw insertError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}));
