// Meta OAuth — Start
// Returns the Meta authorize URL the client should open in a popup.
// Requires Supabase secrets: META_APP_ID, META_REDIRECT_URI
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { signMetaState } from "../_shared/metaOAuthState.ts";

const META_SCOPES = [
  "ads_management",
  "ads_read",
  "business_management",
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_manage_insights",
].join(",");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const appId = Deno.env.get("META_APP_ID");
    const redirectUri = Deno.env.get("META_REDIRECT_URI");
    const stateSecret = Deno.env.get("OAUTH_STATE_SECRET");

    if (!appId || !redirectUri || !stateSecret) {
      return new Response(
        JSON.stringify({
          error:
            "Meta credentials not configured. Add META_APP_ID, META_APP_SECRET, META_REDIRECT_URI, and OAUTH_STATE_SECRET in Lovable Cloud secrets.",
          configured: false,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Store identity server-side; the signed state contains only a random nonce.
    const nonce = crypto.randomUUID();
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: stateError } = await admin.from("oauth_states").insert({ nonce, user_id: userId });
    if (stateError) throw new Error("Unable to create OAuth state");
    const state = await signMetaState({ n: nonce }, stateSecret);

    const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", META_SCOPES);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);

    return new Response(
      JSON.stringify({ authorize_url: url.toString(), configured: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
