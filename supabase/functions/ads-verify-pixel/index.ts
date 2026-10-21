// Verifies a creator's pixel/conversion-API setup by sending a TEST event
// to the platform. Returns { ready: boolean, message: string, details?: any }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  platform: "meta" | "tiktok" | "google" | "snapchat";
}

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } }
    );
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return json({ ready: false, message: "Not authenticated" }, 401);
    }

    const { platform } = (await req.json()) as Body;
    if (!platform) return json({ ready: false, message: "platform required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: integration } = await admin
      .from("ad_integrations")
      .select("pixel_id, access_token, test_event_code, is_active")
      .eq("user_id", user.id)
      .eq("platform", platform)
      .maybeSingle();

    if (!integration?.pixel_id) {
      return json({ ready: false, message: "Pixel ID not saved yet" });
    }

    // Format checks
    const id = integration.pixel_id.trim();
    if (platform === "meta" && !/^\d{10,20}$/.test(id)) {
      return json({ ready: false, message: "Meta Pixel ID should be 10–20 digits" });
    }
    if (platform === "tiktok" && !/^[A-Z0-9]{15,30}$/.test(id)) {
      return json({ ready: false, message: "TikTok Pixel Code looks malformed" });
    }
    if (platform === "google" && !/^(AW-|G-|GTM-)/.test(id)) {
      return json({ ready: false, message: "Google ID should start with AW-, G-, or GTM-" });
    }
    if (platform === "snapchat" && id.length < 10) {
      return json({ ready: false, message: "Snap Pixel ID looks too short" });
    }

    // Real test: Meta CAPI test event
    if (platform === "meta") {
      if (!integration.access_token) {
        return json({
          ready: false,
          message: "Add your Conversions API access token to verify server-side events",
        });
      }
      const url = `https://graph.facebook.com/v18.0/${id}/events?access_token=${encodeURIComponent(
        integration.access_token
      )}`;
      const event_time = Math.floor(Date.now() / 1000);
      const payload: Record<string, unknown> = {
        data: [
          {
            event_name: "TestEvent",
            event_time,
            action_source: "website",
            event_source_url: "https://uply.tv/",
            user_data: { client_user_agent: "UPLY-Verifier/1.0" },
          },
        ],
      };
      if (integration.test_event_code) payload.test_event_code = integration.test_event_code;

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) {
        return json({
          ready: false,
          message: data?.error?.message || "Meta rejected the test event",
          details: data,
        });
      }
      // Mark integration active
      await admin
        .from("ad_integrations")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("platform", "meta");
      return json({
        ready: true,
        message: integration.test_event_code
          ? "Test event sent — check Events Manager → Test Events"
          : "Connected. Add a test_event_code to see live test events.",
        details: data,
      });
    }

    // TikTok / Google / Snap — format ok, mark ready (real verify needs first click)
    await admin
      .from("ad_integrations")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("platform", platform);

    return json({
      ready: true,
      message: "Saved. We'll fire your first conversion event on the next SmartLink click.",
    });
  } catch (e) {
    return json({ ready: false, message: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
}));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
