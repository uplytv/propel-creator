// Server-side Meta Conversions API for SmartLink clicks/presaves
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s.trim().toLowerCase())
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const body = await req.json();
    const {
      link_id,
      event_name, // 'ViewContent' | 'Lead' | 'CompleteRegistration' | 'Subscribe'
      email,
      platform_clicked,
      event_source_url,
      user_agent,
      ip_address,
      fbp, // _fbp cookie
      fbc, // _fbc cookie
    } = body || {};

    if (!link_id || !event_name) {
      return new Response(JSON.stringify({ error: "link_id and event_name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: link } = await supabase
      .from("smart_links")
      .select("id, creator_id, title")
      .eq("id", link_id)
      .maybeSingle();
    if (!link) {
      return new Response(JSON.stringify({ error: "link not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: integration } = await supabase
      .from("ad_integrations")
      .select("pixel_id, access_token, test_event_code, is_active")
      .eq("user_id", link.creator_id)
      .eq("platform", "meta")
      .maybeSingle();

    if (!integration?.is_active || !integration.pixel_id || !integration.access_token) {
      // Silent no-op when creator hasn't configured CAPI
      return new Response(JSON.stringify({ skipped: "no_capi_config" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event_id = crypto.randomUUID();
    const event_time = Math.floor(Date.now() / 1000);

    const user_data: Record<string, unknown> = {
      client_user_agent: user_agent || req.headers.get("user-agent") || undefined,
      client_ip_address: ip_address || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
      fbp,
      fbc,
    };
    if (email) user_data.em = [await sha256(email)];

    const payload = {
      data: [
        {
          event_name,
          event_time,
          event_id,
          action_source: "website",
          event_source_url,
          user_data,
          custom_data: {
            content_name: link.title,
            content_category: "smartlink",
            content_ids: [link.id],
            platform_clicked,
          },
        },
      ],
      ...(integration.test_event_code ? { test_event_code: integration.test_event_code } : {}),
    };

    const url = `https://graph.facebook.com/v19.0/${integration.pixel_id}/events?access_token=${encodeURIComponent(integration.access_token)}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const respBody = await resp.json().catch(() => ({}));

    await supabase.from("smart_link_capi_events").insert({
      link_id: link.id,
      creator_id: link.creator_id,
      event_name,
      event_id,
      pixel_id: integration.pixel_id,
      payload,
      response_status: resp.status,
      response_body: respBody,
    });

    return new Response(
      JSON.stringify({ ok: resp.ok, event_id, status: resp.status }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
