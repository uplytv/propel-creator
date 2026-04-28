// Verifies a creator's custom domain by looking up its DNS TXT records
// via Cloudflare DNS-over-HTTPS and checking for the expected token.
//
// Request: POST { link_id: string }
// Auth:    Requires the calling user to own the smart_link (RLS enforces it).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DohAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}
interface DohResponse {
  Status: number;
  Answer?: DohAnswer[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-scoped client to enforce RLS on the smart_links read.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { link_id } = await req.json().catch(() => ({}));
    if (!link_id || typeof link_id !== "string") {
      return json({ error: "link_id is required" }, 400);
    }

    const { data: link, error: linkErr } = await userClient
      .from("smart_links")
      .select("id, custom_domain, custom_domain_verification_token, custom_domain_verified")
      .eq("id", link_id)
      .maybeSingle();

    if (linkErr) return json({ error: linkErr.message }, 500);
    if (!link) return json({ error: "Link not found or access denied" }, 404);
    if (!link.custom_domain) return json({ error: "No custom domain configured" }, 400);
    if (!link.custom_domain_verification_token) {
      return json({ error: "No verification token issued — re-save the domain" }, 400);
    }

    const expected = `uply-verify=${link.custom_domain_verification_token}`;
    const host = link.custom_domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    // Cloudflare DoH JSON API
    const dohUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=TXT`;
    const dohRes = await fetch(dohUrl, { headers: { Accept: "application/dns-json" } });
    if (!dohRes.ok) {
      return json({ error: `DNS lookup failed (status ${dohRes.status})` }, 502);
    }
    const doh = (await dohRes.json()) as DohResponse;
    const records = (doh.Answer || []).map((a) => a.data.replace(/^"|"$/g, "").replace(/"\s+"/g, ""));

    const matched = records.some((r) => r.includes(expected));

    if (!matched) {
      return json(
        {
          verified: false,
          expected,
          host,
          found: records,
          message: "TXT record not found yet. DNS can take a few minutes to propagate.",
        },
        200,
      );
    }

    // Mark verified using service role (RLS bypass) so we can flip the flag atomically.
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { error: upErr } = await adminClient
      .from("smart_links")
      .update({ custom_domain_verified: true })
      .eq("id", link_id);
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ verified: true, host });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
