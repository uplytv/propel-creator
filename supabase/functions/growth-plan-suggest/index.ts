import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { claudeChat } from "../_shared/claudeChat.ts";
import { jsonResponse, requireUser, serviceClient, strictRateLimit, withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SuggestRequest {
  // What the creator is editing: "task" | "milestone" | "next_action" | "title"
  field: "task" | "milestone" | "next_action" | "title";
  // The current value the creator typed
  current?: string;
  // Optional context: surrounding plan + KPIs
  context?: {
    creatorName?: string;
    members?: number;
    mrr?: number;
    tier?: number;
    challenge?: string;
    title?: string;
    siblings?: string[]; // other items in the same list, to avoid duplicates
  };
}

const SYSTEM = `You are an elite growth coach for solo creators on UPLY (a creator-economy platform).
You write tight, specific, action-oriented growth plan items. Avoid clichés. No fluff. No emojis at the start unless it adds clarity.
Return exactly 3 high-quality alternatives the creator can pick from. Each must be distinct in approach, not paraphrases of each other.`;

function buildPrompt(req: SuggestRequest): string {
  const ctx = req.context ?? {};
  const ctxLines = [
    ctx.creatorName ? `Creator: ${ctx.creatorName}` : null,
    ctx.members != null ? `Members: ${ctx.members}` : null,
    ctx.mrr != null ? `MRR: $${ctx.mrr}` : null,
    ctx.tier != null ? `Tier: ${ctx.tier}` : null,
    ctx.challenge ? `Current challenge: ${ctx.challenge}` : null,
    ctx.title ? `Plan: ${ctx.title}` : null,
    ctx.siblings?.length ? `Already in plan (do NOT duplicate): ${ctx.siblings.join(" | ")}` : null,
  ].filter(Boolean).join("\n");

  const fieldGuide: Record<SuggestRequest["field"], string> = {
    task: "Generate 3 recurring weekly habit ideas. Each should be a specific cadence-based action (e.g. 'Go live every Tuesday 7pm for 30min').",
    milestone: "Generate 3 dated milestone ideas (specific outcome + roughly when, e.g. 'Hit 50 paying members by day 30').",
    next_action: "Generate 3 high-leverage next actions the creator can do this week — specific, no-fluff.",
    title: "Generate 3 punchy plan titles. Each <50 chars. Avoid generic words like 'My Plan'.",
  };

  return `${ctxLines}

Creator is editing: ${req.field.toUpperCase()}
Current draft: "${req.current ?? "(empty)"}"

${fieldGuide[req.field]}

For each suggestion, also include a 1-sentence "reason" explaining why it works.`;
}

serve(withCors(async (req) => {
  // SECURITY: signed-in users only; AI spend is rate limited and fails closed.
  if (req.method !== 'OPTIONS') {
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;
    if (!(await strictRateLimit(serviceClient(), `user:${auth.user.id}`, 'growth-plan-suggest', 20, 10 * 60_000))) {
      return jsonResponse(req, { error: 'Too many requests. Please wait a few minutes and try again.' }, 429);
    }
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as SuggestRequest;
    if (!body?.field) {
      return new Response(JSON.stringify({ error: "field required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Deno.env.get("ANTHROPIC_API_KEY")) throw new Error("ANTHROPIC_API_KEY not configured");

    let data: any;
    try {
      data = await claudeChat({
        model: "claude-fable-5",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: buildPrompt(body) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_suggestions",
              description: "Return 3 growth-plan suggestions",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    minItems: 3,
                    maxItems: 3,
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string", description: "The suggestion the creator can paste in" },
                        reason: { type: "string", description: "1-sentence why this works" },
                      },
                      required: ["text", "reason"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_suggestions" } },
      });
    } catch (e) {
      console.error("AI gateway error:", (e as Error).message);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No suggestions returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("growth-plan-suggest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
