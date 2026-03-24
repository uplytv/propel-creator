import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { creator_id, task_type, source_id } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check usage budget
    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
    const { data: usage } = await supabase
      .from("aria_usage_tracking")
      .select("*")
      .eq("creator_id", creator_id)
      .eq("month", currentMonth)
      .maybeSingle();

    if (usage && usage.api_calls >= usage.budget_limit) {
      await supabase.from("aria_agent_insights").insert({
        creator_id,
        agent_type: "content",
        insight_type: "warning",
        title: "Monthly AI budget reached",
        body: `You've used ${usage.api_calls}/${usage.budget_limit} API calls this month. Upgrade or wait until next month.`,
        priority: 2,
      });
      return new Response(JSON.stringify({ error: "Budget exceeded" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get agent
    const { data: agent } = await supabase
      .from("aria_agents")
      .select("*")
      .eq("creator_id", creator_id)
      .eq("agent_type", "content")
      .maybeSingle();

    if (!agent || agent.status !== "active") {
      return new Response(JSON.stringify({ error: "Content agent not active" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read memories
    const { data: memories } = await supabase
      .from("aria_agent_memory")
      .select("*")
      .eq("creator_id", creator_id)
      .eq("agent_type", "content");

    const voiceMemories = memories?.filter(m => m.memory_type === "voice") || [];
    const boundaryMemories = memories?.filter(m => m.memory_type === "boundary") || [];

    // Get creator profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, creator_type, bio")
      .eq("user_id", creator_id)
      .maybeSingle();

    const memoryContext = voiceMemories.length > 0
      ? `\n\nCreator voice preferences: ${voiceMemories.map(m => `${m.key}: ${JSON.stringify(m.value)}`).join("; ")}`
      : "";
    const boundaryContext = boundaryMemories.length > 0
      ? `\n\nNEVER do these (creator rejected them before): ${boundaryMemories.map(m => `${m.key}: ${JSON.stringify(m.value)}`).join("; ")}`
      : "";

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Create task record
    const { data: task } = await supabase.from("aria_agent_tasks").insert({
      agent_id: agent.id,
      creator_id,
      agent_type: "content",
      task_type,
      task_title: `Content AI: ${task_type}`,
      status: "processing",
      started_at: new Date().toISOString(),
      triggered_by: "autonomous",
    }).select().single();

    let output: any = {};

    if (task_type === "content_calendar") {
      // Generate a 7-day content calendar
      const systemPrompt = `You are ARIA Content AI, a content strategist for creators on UPLY. Generate content calendars that maximize engagement and growth.${memoryContext}${boundaryContext}`;

      const userPrompt = `Create a 7-day content calendar for ${profile?.display_name || "this creator"}.
Creator type: ${profile?.creator_type || "general"}
Bio: ${profile?.bio || "N/A"}

Return a JSON object with this structure:
{
  "calendar": [
    {
      "day": 1,
      "date_label": "Monday",
      "content_type": "short_clip|community_post|live_stream|course_teaser",
      "title": "content title",
      "description": "what to create",
      "platform": "uply|tiktok|instagram|youtube",
      "best_time": "9:00 AM",
      "estimated_engagement": "high|medium|low",
      "caption_draft": "ready-to-use caption"
    }
  ],
  "weekly_theme": "overarching theme",
  "key_hashtags": ["#tag1", "#tag2"]
}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "create_content_calendar",
              description: "Create a 7-day content calendar",
              parameters: {
                type: "object",
                properties: {
                  calendar: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "number" },
                        date_label: { type: "string" },
                        content_type: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        platform: { type: "string" },
                        best_time: { type: "string" },
                        estimated_engagement: { type: "string" },
                        caption_draft: { type: "string" },
                      },
                      required: ["day", "date_label", "content_type", "title", "description", "platform"],
                    },
                  },
                  weekly_theme: { type: "string" },
                  key_hashtags: { type: "array", items: { type: "string" } },
                },
                required: ["calendar", "weekly_theme"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "create_content_calendar" } },
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI gateway error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      output = toolCall ? JSON.parse(toolCall.function.arguments) : {};

    } else if (task_type === "repurpose_scan") {
      // Find old high-performing content to repurpose
      const { data: videos } = await supabase
        .from("videos")
        .select("id, title, view_count, like_count, created_at")
        .eq("creator_id", creator_id)
        .order("view_count", { ascending: false })
        .limit(10);

      const systemPrompt = `You are ARIA Content AI. Analyze existing content and suggest repurposing strategies.${memoryContext}${boundaryContext}`;

      const userPrompt = `Here are this creator's top-performing videos:
${JSON.stringify(videos || [])}

Suggest 3 specific repurposing ideas. Return JSON:
{
  "suggestions": [
    {
      "original_title": "title",
      "repurpose_type": "clip_compilation|behind_the_scenes|tutorial_update|reaction",
      "new_title": "suggested title",
      "description": "what to create",
      "expected_reach": "high|medium",
      "caption_draft": "ready caption"
    }
  ]
}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "suggest_repurposing",
              description: "Suggest content repurposing strategies",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        original_title: { type: "string" },
                        repurpose_type: { type: "string" },
                        new_title: { type: "string" },
                        description: { type: "string" },
                        expected_reach: { type: "string" },
                        caption_draft: { type: "string" },
                      },
                      required: ["original_title", "repurpose_type", "new_title", "description"],
                    },
                  },
                },
                required: ["suggestions"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "suggest_repurposing" } },
        }),
      });

      if (!aiResponse.ok) throw new Error(`AI gateway error: ${aiResponse.status}`);
      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      output = toolCall ? JSON.parse(toolCall.function.arguments) : {};
    }

    // Calculate confidence
    const taskHistory = agent.tasks_completed || 0;
    const approvedCount = agent.tasks_approved || 0;
    const experienceScore = Math.min(taskHistory / 20, 1.0) * 0.3;
    const accuracyScore = (approvedCount / Math.max(taskHistory, 1)) * 0.5;
    const trustScore = (agent.confidence_score || 0.5) * 0.2;
    const confidence = experienceScore + accuracyScore + trustScore;

    const requiresApproval = confidence < 0.85;

    // Update the task
    await supabase.from("aria_agent_tasks").update({
      status: requiresApproval ? "pending" : "completed",
      confidence,
      requires_approval: requiresApproval,
      output_data: output,
      task_title: task_type === "content_calendar"
        ? `📅 7-Day Content Calendar: ${output.weekly_theme || "Your Week"}`
        : `♻️ Repurpose Scan: ${output.suggestions?.length || 0} ideas`,
      completed_at: new Date().toISOString(),
    }).eq("id", task!.id);

    // Increment usage
    await supabase.rpc("increment_aria_usage" as any, { p_creator_id: creator_id }).catch(() => {
      // Fallback: direct upsert
      supabase.from("aria_usage_tracking").upsert({
        creator_id,
        month: currentMonth,
        api_calls: (usage?.api_calls || 0) + 1,
      }, { onConflict: "creator_id,month" });
    });

    // Update agent stats
    await supabase.from("aria_agents").update({
      tasks_completed: (agent.tasks_completed || 0) + 1,
      last_active_at: new Date().toISOString(),
    }).eq("id", agent.id);

    return new Response(JSON.stringify({ success: true, task_id: task!.id, output }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("agent-content-run error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
