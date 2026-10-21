import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { claudeChat } from "../_shared/claudeChat.ts";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { creator_id, task_type } = await req.json();

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (token !== SERVICE_KEY) {
      const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
      if (authErr || !user || user.id !== creator_id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY);

    // Budget check
    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
    const { data: usage } = await supabase.from("aria_usage_tracking").select("*").eq("creator_id", creator_id).eq("month", currentMonth).maybeSingle();
    if (usage && usage.api_calls >= usage.budget_limit) {
      return new Response(JSON.stringify({ error: "Budget exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: agent } = await supabase.from("aria_agents").select("*").eq("creator_id", creator_id).eq("agent_type", "growth").maybeSingle();
    if (!agent || agent.status !== "active") {
      return new Response(JSON.stringify({ error: "Growth agent not active" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabase.from("profiles").select("display_name, creator_type, bio").eq("user_id", creator_id).maybeSingle();
    const { data: memories } = await supabase.from("aria_agent_memory").select("*").eq("creator_id", creator_id).eq("agent_type", "growth");
    const boundaryCtx = memories?.filter(m => m.memory_type === "boundary").map(m => `${m.key}: ${JSON.stringify(m.value)}`).join("; ") || "";

    const { data: task } = await supabase.from("aria_agent_tasks").insert({
      agent_id: agent.id, creator_id, agent_type: "growth", task_type,
      task_title: `Growth AI: ${task_type}`, status: "processing", started_at: new Date().toISOString(),
    }).select().single();

    let output: any = {};

    if (task_type === "funnel_builder") {
      const { data: products } = await supabase.from("products").select("*").eq("creator_id", creator_id).limit(5);

      const messages = [
        { role: "system", content: `You are ARIA Growth AI for UPLY creators. Build high-converting sales funnels.${boundaryCtx ? `\nAvoid: ${boundaryCtx}` : ""}` },
        { role: "user", content: `Build a sales funnel for ${profile?.display_name}. Products: ${JSON.stringify(products?.slice(0, 3) || [])}. Creator type: ${profile?.creator_type || "general"}.` },
      ];
      const tools = [{
        type: "function",
        function: {
          name: "build_funnel",
          description: "Build a sales funnel",
          parameters: {
            type: "object",
            properties: {
              funnel_name: { type: "string" },
              headline: { type: "string" },
              subheadline: { type: "string" },
              hero_paragraph: { type: "string" },
              benefits: { type: "array", items: { type: "string" } },
              cta_text: { type: "string" },
              urgency_line: { type: "string" },
              email_sequence: {
                type: "array",
                items: {
                  type: "object",
                  properties: { subject: { type: "string" }, body: { type: "string" }, send_day: { type: "number" } },
                  required: ["subject", "body", "send_day"],
                },
              },
            },
            required: ["funnel_name", "headline", "subheadline", "benefits", "cta_text"],
          },
        },
      }];
      const tool_choice = { type: "function", function: { name: "build_funnel" } };
      let aiData: any;
      try {
        aiData = await claudeChat({
          model: "claude-sonnet-4-6",
          messages,
          tools,
          tool_choice,
        });
      } catch (err) {
        console.error("Claude error:", (err as Error).message);
        throw new Error(`AI error: ${(err as Error).message}`);
      }
      const tc = aiData.choices?.[0]?.message?.tool_calls?.[0];
      output = tc ? JSON.parse(tc.function.arguments) : {};

      // Store funnel
      await supabase.from("aria_funnels").insert({
        creator_id,
        name: output.funnel_name || "New Funnel",
        landing_page_copy: { headline: output.headline, subheadline: output.subheadline, hero_paragraph: output.hero_paragraph, benefits: output.benefits, cta_text: output.cta_text, urgency_line: output.urgency_line },
        email_sequence: output.email_sequence || [],
      });

    } else if (task_type === "conversion_optimizer") {
      const { data: products } = await supabase.from("products").select("id, name, price, sales").eq("creator_id", creator_id);

      const messages = [
        { role: "system", content: "You are ARIA Growth AI. Analyze conversion data and suggest optimizations." },
        { role: "user", content: `Analyze products for ${profile?.display_name}: ${JSON.stringify(products || [])}. Suggest 3 A/B tests.` },
      ];
      const tools = [{
        type: "function",
        function: {
          name: "suggest_optimizations",
          description: "Suggest conversion optimizations",
          parameters: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: { title: { type: "string" }, description: { type: "string" }, expected_impact: { type: "string" }, priority: { type: "string" } },
                  required: ["title", "description"],
                },
              },
            },
            required: ["suggestions"],
          },
        },
      }];
      const tool_choice = { type: "function", function: { name: "suggest_optimizations" } };
      let aiData: any;
      try {
        aiData = await claudeChat({
          model: "claude-sonnet-4-6",
          messages,
          tools,
          tool_choice,
        });
      } catch (err) {
        console.error("Claude error:", (err as Error).message);
        throw new Error(`AI error: ${(err as Error).message}`);
      }
      const tc = aiData.choices?.[0]?.message?.tool_calls?.[0];
      output = tc ? JSON.parse(tc.function.arguments) : {};

      // Create insights
      for (const s of output.suggestions || []) {
        await supabase.from("aria_agent_insights").insert({
          creator_id, agent_type: "growth", insight_type: "opportunity",
          title: s.title, body: s.description, priority: 5, confidence: 0.7,
          source_task_id: task!.id,
        });
      }
    }

    // Confidence calc
    const conf = Math.min((agent.tasks_completed || 0) / 20, 1) * 0.3 + ((agent.tasks_approved || 0) / Math.max(agent.tasks_completed || 1, 1)) * 0.5 + (agent.confidence_score || 0.5) * 0.2;

    await supabase.from("aria_agent_tasks").update({
      status: conf >= 0.85 ? "completed" : "pending",
      confidence: conf, requires_approval: conf < 0.85,
      output_data: output,
      task_title: task_type === "funnel_builder" ? `📊 Sales Funnel: ${output.funnel_name || "New Funnel"}` : `🎯 ${output.suggestions?.length || 0} Optimization Ideas`,
      completed_at: new Date().toISOString(),
    }).eq("id", task!.id);

    await supabase.from("aria_agents").update({ tasks_completed: (agent.tasks_completed || 0) + 1, last_active_at: new Date().toISOString() }).eq("id", agent.id);

    return new Response(JSON.stringify({ success: true, task_id: task!.id, output }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("agent-growth-run error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}));
