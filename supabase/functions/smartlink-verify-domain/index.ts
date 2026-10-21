// Verifies a creator's custom domain by looking up its DNS TXT records
// via Cloudflare DNS-over-HTTPS and checking for the expected token.
//
// Supports two flows:
//   1) Per-link domain (legacy): POST { link_id }   → checks smart_links.custom_domain
//   2) Per-creator domain (new): POST { domain_id } → checks smart_link_domains.domain
//
// Auth: Requires the calling user; RLS enforces ownership on the read.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
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

Deno.serve(withCors(async (req) => {
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

    // User-scoped client to enforce RLS on the lookup.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json().catch(() => ({}));
    const { link_id, domain_id } = body as { link_id?: string; domain_id?: string };

    if (!link_id && !domain_id) {
      return json({ error: "link_id or domain_id is required" }, 400);
    }

    let host: string;
    let expectedToken: string;
    let mode: "link" | "domain";

    if (domain_id) {
      mode = "domain";
      const { data: dom, error: domErr } = await userClient
        .from("smart_link_domains")
        .select("id, domain, verification_token, verified")
        .eq("id", domain_id)
        .maybeSingle();

      if (domErr) return json({ error: domErr.message }, 500);
      if (!dom) return json({ error: "Domain not found or access denied" }, 404);
      if (!dom.domain) return json({ error: "No domain configured" }, 400);
      if (!dom.verification_token) {
        return json({ error: "No verification token issued — re-add the domain" }, 400);
      }
      host = dom.domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      expectedToken = dom.verification_token;
    } else {
      mode = "link";
      const { data: link, error: linkErr } = await userClient
        .from("smart_links")
        .select("id, custom_domain, custom_domain_verification_token, custom_domain_verified")
        .eq("id", link_id!)
        .maybeSingle();

      if (linkErr) return json({ error: linkErr.message }, 500);
      if (!link) return json({ error: "Link not found or access denied" }, 404);
      if (!link.custom_domain) return json({ error: "No custom domain configured" }, 400);
      if (!link.custom_domain_verification_token) {
        return json({ error: "No verification token issued — re-save the domain" }, 400);
      }
      host = link.custom_domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      expectedToken = link.custom_domain_verification_token;
    }

    const expected = `uply-verify=${expectedToken}`;

    // Cloudflare DoH JSON API
    const dohUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=TXT`;
    const dohRes = await fetch(dohUrl, { headers: { Accept: "application/dns-json" } });
    if (!dohRes.ok) {
      return json({ error: `DNS lookup failed (status ${dohRes.status})` }, 502);
    }
    const doh = (await dohRes.json()) as DohResponse;
    const records = (doh.Answer || []).map((a) =>
      a.data.replace(/^"|"$/g, "").replace(/"\s+"/g, "")
    );

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
        200
      );
    }

    // Mark verified using service role (RLS bypass) so we can flip the flag atomically.
    const adminClient = createClient(supabaseUrl, serviceKey);

    if (mode === "domain") {
      const { error: upErr } = await adminClient
        .from("smart_link_domains")
        .update({ verified: true })
        .eq("id", domain_id!);
      if (upErr) return json({ error: upErr.message }, 500);
    } else {
      const { error: upErr } = await adminClient
        .from("smart_links")
        .update({ custom_domain_verified: true })
        .eq("id", link_id!);
      if (upErr) return json({ error: upErr.message }, 500);
    }

    return json({ verified: true, host });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
}));

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
