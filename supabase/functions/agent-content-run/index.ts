import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { claudeChat } from "../_shared/claudeChat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { creator_id, task_type, source_id } = await req.json();

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
      .select("display_name, creator_type, bio, username")
      .eq("user_id", creator_id)
      .maybeSingle();

    const memoryContext = voiceMemories.length > 0
      ? `\n\nCreator voice preferences: ${voiceMemories.map(m => `${m.key}: ${JSON.stringify(m.value)}`).join("; ")}`
      : "";
    const boundaryContext = boundaryMemories.length > 0
      ? `\n\nNEVER do these (creator rejected them before): ${boundaryMemories.map(m => `${m.key}: ${JSON.stringify(m.value)}`).join("; ")}`
      : "";

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
      // --- PROBLEM 2: Fetch real creator-specific data ---
      
      // Get last 5 videos/recordings
      const { data: recentVideos } = await supabase
        .from("videos")
        .select("title, view_count, like_count, created_at")
        .eq("creator_id", creator_id)
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: recentRecordings } = await supabase
        .from("stream_recordings")
        .select("title, view_count, created_at")
        .eq("creator_id", creator_id)
        .order("created_at", { ascending: false })
        .limit(5);

      // Get top 3 community posts by like_count in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: topPosts } = await supabase
        .from("community_posts")
        .select("title, like_count, comment_count, category")
        .eq("creator_id", creator_id)
        .gte("created_at", thirtyDaysAgo)
        .order("like_count", { ascending: false })
        .limit(3);

      // Get platform learnings for this creator type
      const { data: platformLearnings } = await supabase
        .from("aria_platform_learnings")
        .select("key, value, confidence")
        .eq("creator_type", profile?.creator_type || "general")
        .order("confidence", { ascending: false })
        .limit(5);

      // Build current date context
      const now = new Date();
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const currentDay = dayNames[now.getDay()];
      const currentDate = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

      // Build creator-specific context blocks
      const recentContentBlock = (recentVideos?.length || recentRecordings?.length)
        ? `\n\nRecent content by ${profile?.display_name}:\n${
          [...(recentVideos || []), ...(recentRecordings || [])]
            .slice(0, 5)
            .map((v: any) => `- "${v.title}" (${v.view_count || 0} views, ${v.like_count || 0} likes)`)
            .join("\n")
        }`
        : "";

      const topPostsBlock = topPosts?.length
        ? `\n\nTop community posts (last 30 days):\n${topPosts.map(p => `- "${p.title}" (${p.like_count} likes, ${p.comment_count} comments, category: ${p.category})`).join("\n")}`
        : "";

      const learningsBlock = platformLearnings?.length
        ? `\n\nPlatform insights for ${profile?.creator_type} creators:\n${platformLearnings.map(l => `- ${l.key}: ${JSON.stringify(l.value)} (${Math.round((l.confidence || 0) * 100)}% confidence)`).join("\n")}`
        : "";

      // Niche-specific instruction
      const nicheInstruction = getNicheInstruction(profile?.creator_type);

      const systemPrompt = `You are ARIA Content AI, a personalized content strategist for ${profile?.display_name || "this creator"} on UPLY. You create content calendars that are SPECIFIC to this creator's niche, audience, and content history. Never use generic suggestions like "Morning Routine" or "Productivity Hacks" unless they are genuinely relevant to this creator's niche. Every suggestion must feel like it was written specifically for ${profile?.display_name}.${memoryContext}${boundaryContext}`;

      const userPrompt = `Create a 7-day content calendar for ${profile?.display_name || "this creator"}.

Today is ${currentDay}, ${currentDate}.
Creator type: ${profile?.creator_type || "general"}
Creator username: @${profile?.username || "creator"}
Bio: ${profile?.bio || "N/A"}
${nicheInstruction}
${recentContentBlock}
${topPostsBlock}
${learningsBlock}

IMPORTANT RULES:
- Address ${profile?.display_name} by name in the weekly theme
- Suggest content topics SPECIFIC to their ${profile?.creator_type || "general"} niche
- Reference their recent content when suggesting follow-ups or series
- Recommend specific days and posting times based on their platform
- Start from ${currentDay} (today) and plan 7 days forward
- Make every single suggestion feel personalized, not generic

Return a JSON object with this structure:
{
  "calendar": [
    {
      "day": 1,
      "date_label": "${currentDay}",
      "content_type": "short_clip|community_post|live_stream|course_teaser",
      "title": "specific content title relevant to their niche",
      "description": "detailed description of what to create",
      "platform": "uply|tiktok|instagram|youtube",
      "best_time": "9:00 AM",
      "estimated_engagement": "high|medium|low",
      "caption_draft": "ready-to-use caption with relevant hashtags"
    }
  ],
  "weekly_theme": "personalized theme mentioning creator name",
  "key_hashtags": ["#tag1", "#tag2"]
}`;

      let aiData: any;
      try {
        aiData = await claudeChat({
          model: "claude-sonnet-4-6",
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
        });
      } catch (err) {
        console.error("Claude error:", (err as Error).message);
        throw new Error(`AI gateway error: ${(err as Error).message}`);
      }

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

      let aiData: any;
      try {
        aiData = await claudeChat({
          model: "claude-sonnet-4-6",
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
        });
      } catch (err) {
        console.error("Claude error:", (err as Error).message);
        throw new Error(`AI gateway error: ${(err as Error).message}`);
      }
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      output = toolCall ? JSON.parse(toolCall.function.arguments) : {};
    }

    // Calculate confidence
    const taskHistory = agent.tasks_completed || 0;
    const approvedCount = agent.tasks_approved || 0;
    const experienceScore = Math.min(taskHistory / 20, 1.0) * 0.3;
    const accuracyScore = (approvedCount / Math.max(taskHistory, 1)) * 0.5;
    const trustScore = (agent.confidence_score || 0.65) * 0.2;
    let confidence = experienceScore + accuracyScore + trustScore;

    // PROBLEM 1: Override for content_calendar — low risk, auto-approve at 0.75
    if (task_type === "content_calendar" && confidence < 0.75) {
      confidence = 0.75;
    }

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

function getNicheInstruction(creatorType: string | null | undefined): string {
  const type = (creatorType || "general").toLowerCase();
  const map: Record<string, string> = {
    fitness: "This is a FITNESS creator. Suggest workout content, form tips, transformation challenges, nutrition advice, and fitness Q&As. Never suggest unrelated generic content.",
    finance: "This is a FINANCE creator. Suggest market analysis, money tips, investment education, budgeting challenges, and financial literacy content. Never suggest unrelated generic content.",
    gaming: "This is a GAMING creator. Suggest stream highlights, game reviews, clip compilations, tier lists, reaction content, and gaming challenges. Never suggest unrelated generic content.",
    music: "This is a MUSIC creator. Suggest performance clips, production tutorials, song breakdowns, behind-the-scenes sessions, and collaboration content. Never suggest unrelated generic content.",
    education: "This is an EDUCATION creator. Suggest lesson recaps, study tips, concept explainers, Q&A sessions, and course teasers. Never suggest unrelated generic content.",
    beauty: "This is a BEAUTY creator. Suggest tutorials, product reviews, get-ready-with-me content, skincare routines, and trend breakdowns. Never suggest unrelated generic content.",
    cooking: "This is a COOKING/FOOD creator. Suggest recipe videos, cooking challenges, ingredient spotlights, meal prep guides, and food reviews. Never suggest unrelated generic content.",
    tech: "This is a TECH creator. Suggest product reviews, tutorials, setup tours, coding sessions, and tech news commentary. Never suggest unrelated generic content.",
    lifestyle: "This is a LIFESTYLE creator. Suggest day-in-my-life vlogs, routines, favorites roundups, Q&As, and collaboration content.",
    art: "This is an ART creator. Suggest time-lapse creation videos, technique tutorials, art challenges, commission reveals, and creative process content.",
  };
  return map[type] || `This is a ${type.toUpperCase()} creator. Suggest content specific to their ${type} niche. Be specific and relevant.`;
}
