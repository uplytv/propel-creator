import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, action_type = "login" } = await req.json();

    if (!identifier || typeof identifier !== "string") {
      return new Response(
        JSON.stringify({ error: "identifier is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize identifier (lowercase email, trim whitespace)
    const normalizedId = identifier.toLowerCase().trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Max attempts and windows differ by action type
    const config: Record<string, { max: number; window: number; block: number }> = {
      login: { max: 10, window: 900, block: 1800 },       // 10 attempts per 15min, block 30min
      signup: { max: 5, window: 3600, block: 3600 },      // 5 signups per hour, block 1hr
      password_reset: { max: 3, window: 3600, block: 3600 }, // 3 resets per hour, block 1hr
    };

    const cfg = config[action_type] || config.login;

    const { data, error } = await supabase.rpc("check_auth_rate_limit", {
      p_identifier: normalizedId,
      p_action_type: action_type,
      p_max_attempts: cfg.max,
      p_window_seconds: cfg.window,
      p_block_seconds: cfg.block,
    });

    if (error) {
      console.error("Rate limit check error:", error);
      // Fail open — don't block auth if rate limiter is broken
      return new Response(
        JSON.stringify({ allowed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Rate check error:", err);
    // Fail open
    return new Response(
      JSON.stringify({ allowed: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
