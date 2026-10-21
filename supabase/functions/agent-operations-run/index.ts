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

    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
    const { data: usage } = await supabase.from("aria_usage_tracking").select("*").eq("creator_id", creator_id).eq("month", currentMonth).maybeSingle();
    if (usage && usage.api_calls >= usage.budget_limit) {
      return new Response(JSON.stringify({ error: "Budget exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: agent } = await supabase.from("aria_agents").select("*").eq("creator_id", creator_id).eq("agent_type", "operations").maybeSingle();
    if (!agent || agent.status !== "active") {
      return new Response(JSON.stringify({ error: "Operations agent not active" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabase.from("profiles").select("display_name, creator_type").eq("user_id", creator_id).maybeSingle();

    const { data: task } = await supabase.from("aria_agent_tasks").insert({
      agent_id: agent.id, creator_id, agent_type: "operations", task_type,
      task_title: `Operations AI: ${task_type}`, status: "processing", started_at: new Date().toISOString(),
    }).select().single();

    let output: any = {};

    if (task_type === "weekly_report") {
      // Gather stats for the last 7 days
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const { count: newMembers } = await supabase.from("community_members").select("id", { count: "exact", head: true }).eq("creator_id", creator_id).gte("joined_at", weekAgo);
      const { data: tasks7d } = await supabase.from("aria_agent_tasks").select("id, task_type, status").eq("creator_id", creator_id).gte("created_at", weekAgo);
      const { count: newPosts } = await supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("creator_id", creator_id).gte("created_at", weekAgo);

      const completedTasks = tasks7d?.filter(t => t.status === "completed").length || 0;

      const messages = [
        { role: "system", content: "You are ARIA Operations AI writing a CEO-level weekly report. Be concise, data-driven, and actionable." },
        { role: "user", content: `Weekly report for ${profile?.display_name}:\n- New members: ${newMembers || 0}\n- Community posts: ${newPosts || 0}\n- AI tasks completed: ${completedTasks}\n- Hours saved (est): ${(completedTasks * 0.5).toFixed(1)}\n\nWrite a 400-word report with: Executive Summary, What's Working, What Needs Attention, Top 3 Opportunities, One Action for Today.` },
      ];
      let aiData: any;
      try {
        aiData = await claudeChat({
          model: "claude-sonnet-4-6",
          messages,
        });
      } catch (err) {
        console.error("Claude error:", (err as Error).message);
        throw new Error(`AI error: ${(err as Error).message}`);
      }

      const narrative = aiData.choices?.[0]?.message?.content || "Report unavailable.";
      const reportDate = new Date().toISOString().slice(0, 10);

      output = {
        narrative,
        stats: { new_members: newMembers || 0, new_posts: newPosts || 0, tasks_completed: completedTasks, hours_saved: completedTasks * 0.5 },
      };

      await supabase.from("aria_daily_reports").upsert({
        creator_id, report_date: reportDate,
        operations_agent_summary: output.stats,
        total_tasks_completed: completedTasks,
        members_gained: newMembers || 0,
        hours_saved: completedTasks * 0.5,
        narrative,
      }, { onConflict: "creator_id,report_date" });

      // Send notification
      await supabase.from("notifications").insert({
        user_id: creator_id,
        type: "aria_weekly_report",
        title: "📊 Your Weekly AI Team Report",
        message: `Your AI team completed ${completedTasks} tasks and saved you ~${(completedTasks * 0.5).toFixed(1)} hours this week.`,
        link: "/dashboard/ai-team",
      });

    } else if (task_type === "revenue_anomaly") {
      // Simple revenue check from available data
      const { data: recentProducts } = await supabase.from("products").select("id, name, sales, revenue").eq("creator_id", creator_id);
      const totalRevenue = recentProducts?.reduce((sum, p) => sum + (p.revenue || 0), 0) || 0;

      output = { total_revenue: totalRevenue, products_count: recentProducts?.length || 0, status: "analyzed" };

      if (totalRevenue > 0) {
        await supabase.from("aria_agent_insights").insert({
          creator_id, agent_type: "operations", insight_type: "win",
          title: `💰 Revenue Snapshot: $${totalRevenue.toFixed(2)}`,
          body: `You have ${recentProducts?.length || 0} products generating revenue. Keep growing!`,
          priority: 7, confidence: 0.9, source_task_id: task!.id,
        });
      }
    }

    const conf = Math.min((agent.tasks_completed || 0) / 20, 1) * 0.3 + ((agent.tasks_approved || 0) / Math.max(agent.tasks_completed || 1, 1)) * 0.5 + (agent.confidence_score || 0.5) * 0.2;

    await supabase.from("aria_agent_tasks").update({
      status: "completed", confidence: conf, requires_approval: false,
      output_data: output,
      task_title: task_type === "weekly_report" ? "📊 Weekly AI Team Report" : "💰 Revenue Anomaly Check",
      completed_at: new Date().toISOString(),
    }).eq("id", task!.id);

    await supabase.from("aria_agents").update({ tasks_completed: (agent.tasks_completed || 0) + 1, last_active_at: new Date().toISOString() }).eq("id", agent.id);

    return new Response(JSON.stringify({ success: true, task_id: task!.id, output }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("agent-operations-run error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}));
