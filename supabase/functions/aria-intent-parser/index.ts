import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const INTENT_SCHEMA = `
You are an intent parser for a creator platform called UPLY. Map the creator's
natural-language request to ONE of the supported intents below and extract
parameters. Return JSON only matching: { "intent": string, "params": object,
"summary": string, "requires_approval": boolean, "confidence": number }.

READ intents (requires_approval=false):
- "members.list"      params: { sort?: "ltv"|"joined"|"name", limit?: number (default 10), since?: ISO date }
- "revenue.summary"   params: { window: "mtd"|"last_30d"|"last_month", compare?: boolean }
- "content.performance" params: { window?: "7d"|"30d", limit?: number }

WRITE intents (requires_approval=true):
- "tier.create"        params: { name: string, price_monthly: number, description?: string }
- "email.draft"        params: { segment: "all"|"active"|"churned", subject: string, body: string }
- "announcement.draft" params: { body: string, audience: "followers"|"members" }

If ambiguous, pick the closest READ. summary should be a one-line plain English
recap. Return ONLY the JSON object, no prose, no markdown fences.
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsError || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const creatorId = claims.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Rate limit: 30/hour
    const { data: rateData } = await admin.rpc("aria_command_count_last_hour", {
      _creator: creatorId,
    });
    if ((rateData ?? 0) >= 30) {
      return json({ error: "Rate limit exceeded (30/hour)." }, 429);
    }

    const body = await req.json().catch(() => ({}));
    const message = (body?.message ?? "").toString().trim();
    if (!message || message.length > 2000) {
      return json({ error: "message required (<=2000 chars)" }, 400);
    }

    // Call Lovable AI Gateway
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: INTENT_SCHEMA },
          { role: "user", content: message },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      return json({ error: `AI gateway error ${aiResp.status}: ${t.slice(0, 200)}` }, 502);
    }
    const aiJson = await aiResp.json();
    const raw = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch {
      return json({ error: "Failed to parse AI output", raw }, 502);
    }

    const intent = String(parsed.intent || "");
    const params = parsed.params ?? {};
    const summary = String(parsed.summary || "");
    const requires_approval = Boolean(parsed.requires_approval);

    const { data: action, error: insertErr } = await admin
      .from("aria_actions")
      .insert({
        creator_id: creatorId,
        intent,
        parsed_params: params,
        summary,
        requires_approval,
        status: "pending",
      })
      .select()
      .single();

    if (insertErr) return json({ error: insertErr.message }, 500);

    return json({ action });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
