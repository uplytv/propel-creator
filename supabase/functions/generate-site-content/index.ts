// Sites AI generator — uses Lovable AI Gateway, debits creator credits at 2× cost.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withCors } from "../_shared/security.ts";

const cors = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Gemini 3 Flash public pricing (USD / 1M tokens). We charge 2× per token.
const IN_USD_PER_M = 0.075;
const OUT_USD_PER_M = 0.30;
const MARKUP = 2;
const USD_PER_CREDIT = 0.05; // 100 credits = $5 pack
const MIN_CREDITS = 2;

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { prompt, pageType = "lead_capture", pageId = null } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Balance check
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: wallet } = await admin.from("wallets").select("credits").eq("user_id", user.id).maybeSingle();
    const balance = wallet?.credits ?? 0;
    if (balance < MIN_CREDITS) {
      return new Response(JSON.stringify({ error: "insufficient_credits", balance, required: MIN_CREDITS }), {
        status: 402, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const system = `You write high-converting landing page copy for creators. Return ONLY valid JSON with keys: headline (short, punchy), subheadline (one supporting sentence), body (2-3 short paragraphs, plain text), button_text (short CTA, only if pageType is lead_capture or sales_page), benefits (newline-separated list of 3-5, only if pageType is sales_page), success_message (only if lead_capture), next_steps (newline-separated list of 3, only if thank_you). No markdown, no code fences.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Page type: ${pageType}\n\nCreator prompt: ${prompt}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "ai_credits_exhausted" }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
      throw new Error(`AI gateway ${aiRes.status}: ${txt}`);
    }

    const aiJson = await aiRes.json();
    const raw = aiJson.choices?.[0]?.message?.content ?? "{}";
    let generated: Record<string, unknown> = {};
    try { generated = JSON.parse(raw); } catch { generated = { body: raw }; }

    const inTok = aiJson.usage?.prompt_tokens ?? 0;
    const outTok = aiJson.usage?.completion_tokens ?? 0;
    const rawUsd = (inTok * IN_USD_PER_M + outTok * OUT_USD_PER_M) / 1_000_000;
    const chargedUsd = rawUsd * MARKUP;
    const credits = Math.max(MIN_CREDITS, Math.ceil(chargedUsd / USD_PER_CREDIT));

    // Debit
    await admin.from("wallets").update({ credits: balance - credits }).eq("user_id", user.id);

    // Log the generation for the Sites side panel
    const previewSource = (generated.headline || generated.subheadline || generated.body || "") as string;
    const preview = typeof previewSource === "string" ? previewSource.slice(0, 200) : "";
    await admin.from("site_ai_generations").insert({
      user_id: user.id,
      page_id: pageId,
      page_type: pageType,
      prompt: prompt.slice(0, 2000),
      credits_charged: credits,
      input_tokens: inTok,
      output_tokens: outTok,
      model: "google/gemini-3-flash-preview",
      preview,
    });

    return new Response(JSON.stringify({
      content: generated,
      credits_charged: credits,
      credits_remaining: balance - credits,
      tokens: { input: inTok, output: outTok },
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}));
