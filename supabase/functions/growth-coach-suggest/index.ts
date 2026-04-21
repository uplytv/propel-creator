// Weekly AI Coach: returns 3 prioritized actions based on plan + KPIs
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { context } = await req.json();
    const ctx = context ?? {};

    const system = `You are an elite growth coach for creators on UPLY.
Given a creator's current KPIs, growth plan, and primary challenge, return EXACTLY 3 high-leverage actions for THIS WEEK.
- Concrete, action-oriented (verb-first, <80 chars).
- Ordered by impact (highest first).
- Each includes a one-sentence "why" tied to their data.
- Use 'effort' = low/medium/high and 'impact' = low/medium/high.`;

    const user = `Creator: ${ctx.creatorName ?? "Creator"}
Tier: ${ctx.tier ?? 1}
Members: ${ctx.members ?? 0}
MRR: $${ctx.mrr ?? 0}
Primary challenge: ${ctx.challenge ?? "n/a"}
Plan title: ${ctx.planTitle ?? "n/a"}
Target KPIs: ${JSON.stringify(ctx.targetKpis ?? {})}
Current weekly habits: ${(ctx.weeklyTasks ?? []).slice(0, 6).join(" | ") || "none"}
Upcoming milestones: ${(ctx.milestones ?? []).slice(0, 5).join(" | ") || "none"}
Recently completed: ${(ctx.completed ?? []).slice(0, 5).join(" | ") || "none"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [{
          type: "function",
          function: {
            name: "weekly_actions",
            description: "Return 3 prioritized actions for this week.",
            parameters: {
              type: "object",
              properties: {
                actions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      why: { type: "string" },
                      effort: { type: "string", enum: ["low", "medium", "high"] },
                      impact: { type: "string", enum: ["low", "medium", "high"] },
                    },
                    required: ["title", "why", "effort", "impact"],
                    additionalProperties: false,
                  },
                  minItems: 3,
                  maxItems: 3,
                },
                headline: { type: "string", description: "One-sentence weekly focus theme." },
              },
              required: ["actions", "headline"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "weekly_actions" } },
      }),
    });

    if (response.status === 429)
      return new Response(JSON.stringify({ error: "Slow down — try again in a few seconds." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (response.status === 402)
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : { actions: [], headline: "" };

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("growth-coach-suggest", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
