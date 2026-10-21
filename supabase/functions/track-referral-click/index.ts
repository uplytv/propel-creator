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
    const { data: link } = await supabase
      .from("affiliate_links")
      .select("id, clicks")
      .eq("code", code)
      .maybeSingle();

    if (link) {
      await supabase
        .from("affiliate_links")
        .update({ clicks: (link.clicks || 0) + 1 })
        .eq("id", link.id);
      console.log(`Click tracked for affiliate code ${code}: ${(link.clicks || 0) + 1} total`);
    } else {
      // Try matching by referral_code in profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("referral_code", code)
        .maybeSingle();

      if (profile) {
        // Check if affiliate_links row exists for this user
        const { data: existingLink } = await supabase
          .from("affiliate_links")
          .select("id, clicks")
          .eq("user_id", profile.user_id)
          .maybeSingle();

        if (existingLink) {
          await supabase
            .from("affiliate_links")
            .update({ clicks: (existingLink.clicks || 0) + 1 })
            .eq("id", existingLink.id);
          console.log(`Click tracked for profile referral code ${code}`);
        }
      } else {
        console.log(`No affiliate link or profile found for code: ${code}`);
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
}));
