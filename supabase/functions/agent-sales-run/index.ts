import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { creator_id, task_type, member_id } = await req.json();

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Budget check
    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
    const { data: usage } = await supabase.from("aria_usage_tracking").select("*").eq("creator_id", creator_id).eq("month", currentMonth).maybeSingle();
    if (usage && usage.api_calls >= usage.budget_limit) {
      return new Response(JSON.stringify({ error: "Budget exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: agent } = await supabase.from("aria_agents").select("*").eq("creator_id", creator_id).eq("agent_type", "sales").maybeSingle();
    if (!agent || agent.status !== "active") {
      return new Response(JSON.stringify({ error: "Sales agent not active" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabase.from("profiles").select("display_name, creator_type").eq("user_id", creator_id).maybeSingle();

    const { data: task } = await supabase.from("aria_agent_tasks").insert({
      agent_id: agent.id, creator_id, agent_type: "sales", task_type,
      task_title: `Sales AI: ${task_type}`, status: "processing", started_at: new Date().toISOString(),
    }).select().single();

    let output: any = {};

    if (task_type === "buying_signal_detection") {
      // Check for buying signals in recent community posts
      const { data: recentPosts } = await supabase
        .from("community_posts")
        .select("id, title, body, author_id")
        .eq("creator_id", creator_id)
        .gte("created_at", new Date(Date.now() - 86400000).toISOString())
        .limit(50);

      const buyingKeywords = ["how much", "price", "where buy", "want this", "sign me up", "enroll", "is this for sale", "cost", "purchase"];
      const signals: any[] = [];

      for (const post of recentPosts || []) {
        const text = `${post.title} ${post.body}`.toLowerCase();
        if (buyingKeywords.some(kw => text.includes(kw))) {
          // Check do_not_contact
          const { data: dnc } = await supabase.from("aria_agent_memory")
            .select("id").eq("creator_id", creator_id).eq("key", `do_not_contact_${post.author_id}`).maybeSingle();
          if (!dnc) {
            signals.push({ post_id: post.id, author_id: post.author_id, text: post.title });
          }
        }
      }

      output = { signals_found: signals.length, signals: signals.slice(0, 5) };

      for (const s of signals.slice(0, 3)) {
        const { data: authorProfile } = await supabase.from("profiles").select("display_name, username").eq("user_id", s.author_id).maybeSingle();
        await supabase.from("aria_agent_insights").insert({
          creator_id, agent_type: "sales", insight_type: "opportunity",
          title: `💰 ${authorProfile?.display_name || "A member"} appears interested in buying`,
          body: `Detected buying signal in their post: "${s.text}". Consider reaching out personally.`,
          action_label: "View Post", action_url: `/__space__`,
          priority: 3, confidence: 0.65, source_task_id: task!.id,
        });
      }

    } else if (task_type === "upsell_sequence") {
      // Generate upsell ideas
      const { data: products } = await supabase.from("products").select("id, name, price, description").eq("creator_id", creator_id).limit(5);

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "You are ARIA Sales AI. Create personalized upsell sequences that feel helpful, not pushy. Never fabricate testimonials or social proof." },
            { role: "user", content: `Create upsell ideas for ${profile?.display_name}'s products: ${JSON.stringify(products || [])}` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "create_upsells",
              description: "Create upsell suggestions",
              parameters: {
                type: "object",
                properties: {
                  upsells: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { product_name: { type: "string" }, message: { type: "string" }, timing: { type: "string" } },
                      required: ["product_name", "message", "timing"],
                    },
                  },
                },
                required: ["upsells"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "create_upsells" } },
        }),
      });
      if (!aiResp.ok) throw new Error(`AI error: ${aiResp.status}`);
      const aiData = await aiResp.json();
      const tc = aiData.choices?.[0]?.message?.tool_calls?.[0];
      output = tc ? JSON.parse(tc.function.arguments) : {};
    }

    const conf = Math.min((agent.tasks_completed || 0) / 20, 1) * 0.3 + ((agent.tasks_approved || 0) / Math.max(agent.tasks_completed || 1, 1)) * 0.5 + (agent.confidence_score || 0.5) * 0.2;

    await supabase.from("aria_agent_tasks").update({
      status: "pending", confidence: conf, requires_approval: true,
      output_data: output,
      task_title: task_type === "buying_signal_detection" ? `💰 ${output.signals_found || 0} Buying Signals` : `📈 Upsell Sequence Ready`,
      completed_at: new Date().toISOString(),
    }).eq("id", task!.id);

    await supabase.from("aria_agents").update({ tasks_completed: (agent.tasks_completed || 0) + 1, last_active_at: new Date().toISOString() }).eq("id", agent.id);

    return new Response(JSON.stringify({ success: true, task_id: task!.id, output }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("agent-sales-run error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
