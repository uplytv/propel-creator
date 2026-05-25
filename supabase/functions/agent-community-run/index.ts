import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BLOCKED_WORDS = ["lawsuit", "sue", "refund", "scam", "fraud", "cancel"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { creator_id, task_type, member_id } = await req.json();

    // AuthZ: allow service-role bearer (internal/cron) OR a user JWT matching creator_id
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

    const { data: agent } = await supabase.from("aria_agents").select("*").eq("creator_id", creator_id).eq("agent_type", "community").maybeSingle();
    if (!agent || agent.status !== "active") {
      return new Response(JSON.stringify({ error: "Community agent not active" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabase.from("profiles").select("display_name, creator_type").eq("user_id", creator_id).maybeSingle();

    const { data: task } = await supabase.from("aria_agent_tasks").insert({
      agent_id: agent.id, creator_id, agent_type: "community", task_type,
      task_title: `Community AI: ${task_type}`, status: "processing", started_at: new Date().toISOString(),
    }).select().single();

    let output: any = {};

    if (task_type === "daily_digest") {
      // Aggregate community activity from last 24 hours
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const { count: newPosts } = await supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("creator_id", creator_id).gte("created_at", yesterday);
      const { count: newMembers } = await supabase.from("community_members").select("id", { count: "exact", head: true }).eq("creator_id", creator_id).gte("joined_at", yesterday);

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "You are ARIA Community AI. Write brief, actionable daily community summaries for creators." },
            { role: "user", content: `Daily digest for ${profile?.display_name}'s community:\n- ${newPosts || 0} new posts\n- ${newMembers || 0} new members\n\nWrite a 60-second creator summary (under 100 words) highlighting what happened and one suggested action.` },
          ],
        }),
      });
      if (!aiResp.ok) throw new Error(`AI error: ${aiResp.status}`);
      const aiData = await aiResp.json();
      output = {
        summary: aiData.choices?.[0]?.message?.content || "",
        stats: { new_posts: newPosts || 0, new_members: newMembers || 0 },
      };

      await supabase.from("aria_agent_insights").insert({
        creator_id, agent_type: "community", insight_type: "trend",
        title: "📊 Daily Community Digest",
        body: output.summary, priority: 5, confidence: 0.8,
        source_task_id: task!.id,
      });

    } else if (task_type === "churn_detection") {
      // Find at-risk members (no activity in 14+ days, subscription renewing in 7 days)
      const { data: members } = await supabase
        .from("community_members")
        .select("user_id, joined_at")
        .eq("creator_id", creator_id);

      const atRiskMembers: any[] = [];
      for (const member of (members || []).slice(0, 20)) {
        // Check do_not_contact
        const { data: dnc } = await supabase.from("aria_agent_memory")
          .select("id").eq("creator_id", creator_id).eq("key", `do_not_contact_${member.user_id}`).maybeSingle();
        if (dnc) continue;

        const { count: recentActivity } = await supabase
          .from("community_post_likes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", member.user_id)
          .gte("created_at", new Date(Date.now() - 14 * 86400000).toISOString());

        if ((recentActivity || 0) === 0) {
          atRiskMembers.push(member);
        }
      }

      output = { at_risk_count: atRiskMembers.length, members: atRiskMembers.slice(0, 5).map(m => m.user_id) };

      if (atRiskMembers.length > 0) {
        await supabase.from("aria_agent_insights").insert({
          creator_id, agent_type: "community", insight_type: "warning",
          title: `⚠️ ${atRiskMembers.length} members at risk of churning`,
          body: `${atRiskMembers.length} community members haven't engaged in 14+ days. Consider reaching out with a personal message.`,
          action_label: "View Members", action_url: `/__space__`,
          priority: 3, confidence: 0.75, source_task_id: task!.id,
        });

        // Send churn_risk handoff to Sales AI
        for (const m of atRiskMembers.slice(0, 3)) {
          await supabase.from("aria_agent_handoffs").insert({
            from_agent: "community", to_agent: "sales", creator_id,
            trigger_task_id: task!.id, handoff_type: "churn_risk_detected",
            payload: { member_id: m.user_id, days_inactive: 14 },
          });
        }
      }
    }

    const conf = Math.min((agent.tasks_completed || 0) / 20, 1) * 0.3 + ((agent.tasks_approved || 0) / Math.max(agent.tasks_completed || 1, 1)) * 0.5 + (agent.confidence_score || 0.5) * 0.2;

    await supabase.from("aria_agent_tasks").update({
      status: conf >= 0.85 ? "completed" : "pending",
      confidence: conf, requires_approval: conf < 0.85 && task_type !== "daily_digest",
      output_data: output,
      task_title: task_type === "daily_digest" ? "📊 Daily Community Digest" : `⚠️ ${output.at_risk_count || 0} Churn Risks Detected`,
      completed_at: new Date().toISOString(),
    }).eq("id", task!.id);

    await supabase.from("aria_agents").update({ tasks_completed: (agent.tasks_completed || 0) + 1, last_active_at: new Date().toISOString() }).eq("id", agent.id);

    return new Response(JSON.stringify({ success: true, task_id: task!.id, output }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("agent-community-run error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
