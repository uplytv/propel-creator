import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENT_ENDPOINTS: Record<string, string> = {
  content: "agent-content-run",
  growth: "agent-growth-run",
  community: "agent-community-run",
  sales: "agent-sales-run",
  operations: "agent-operations-run",
};

const HANDOFF_TO_TASK: Record<string, { agent: string; task_type: string }> = {
  content_ready: { agent: "growth", task_type: "conversion_optimizer" },
  funnel_ready: { agent: "sales", task_type: "upsell_sequence" },
  new_member_joined: { agent: "community", task_type: "daily_digest" },
  sale_completed: { agent: "operations", task_type: "revenue_anomaly" },
  churn_risk_detected: { agent: "sales", task_type: "buying_signal_detection" },
  revenue_anomaly: { agent: "growth", task_type: "conversion_optimizer" },
};

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Cron-only endpoint: require service-role bearer
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (token !== SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY);
    const baseUrl = Deno.env.get("SUPABASE_URL")!;

    // 1. Process pending handoffs
    const { data: handoffs } = await supabase
      .from("aria_agent_handoffs")
      .select("*")
      .eq("status", "pending")
      .limit(20);

    for (const handoff of handoffs || []) {
      const mapping = HANDOFF_TO_TASK[handoff.handoff_type];
      if (!mapping) continue;

      const endpoint = AGENT_ENDPOINTS[mapping.agent];
      if (!endpoint) continue;

      try {
        await fetch(`${baseUrl}/functions/v1/${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            creator_id: handoff.creator_id,
            task_type: mapping.task_type,
            ...handoff.payload,
          }),
        });
      } catch (e) {
        console.error(`Handoff ${handoff.id} failed:`, e);
      }

      await supabase.from("aria_agent_handoffs").update({
        status: "processed",
        processed_at: new Date().toISOString(),
      }).eq("id", handoff.id);
    }

    // 2. Schedule periodic tasks for active creators
    const { data: activeAgents } = await supabase
      .from("aria_agents")
      .select("creator_id, agent_type, last_active_at, status")
      .eq("status", "active");

    // Group by creator
    const creatorAgents = new Map<string, string[]>();
    for (const a of activeAgents || []) {
      if (!creatorAgents.has(a.creator_id)) creatorAgents.set(a.creator_id, []);
      creatorAgents.get(a.creator_id)!.push(a.agent_type);
    }

    const now = new Date();
    const hour = now.getUTCHours();
    const dayOfWeek = now.getUTCDay(); // 0=Sun

    for (const [creatorId, agents] of creatorAgents) {
      // Community: daily_digest at 13:00 UTC (8am ET)
      if (agents.includes("community") && hour === 13) {
        // Check if already ran today
        const today = now.toISOString().slice(0, 10);
        const { count } = await supabase.from("aria_agent_tasks")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", creatorId)
          .eq("agent_type", "community")
          .eq("task_type", "daily_digest")
          .gte("created_at", today);

        if ((count || 0) === 0) {
          fetch(`${baseUrl}/functions/v1/agent-community-run`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({ creator_id: creatorId, task_type: "daily_digest" }),
          }).catch(() => {});
        }
      }

      // Content: content_calendar on Mondays at 13:00 UTC
      if (agents.includes("content") && dayOfWeek === 1 && hour === 13) {
        const today = now.toISOString().slice(0, 10);
        const { count } = await supabase.from("aria_agent_tasks")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", creatorId)
          .eq("task_type", "content_calendar")
          .gte("created_at", today);

        if ((count || 0) === 0) {
          fetch(`${baseUrl}/functions/v1/agent-content-run`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({ creator_id: creatorId, task_type: "content_calendar" }),
          }).catch(() => {});
        }
      }

      // Operations: weekly_report on Mondays at 12:00 UTC (7am ET)
      if (agents.includes("operations") && dayOfWeek === 1 && hour === 12) {
        const today = now.toISOString().slice(0, 10);
        const { count } = await supabase.from("aria_agent_tasks")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", creatorId)
          .eq("task_type", "weekly_report")
          .gte("created_at", today);

        if ((count || 0) === 0) {
          fetch(`${baseUrl}/functions/v1/agent-operations-run`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({ creator_id: creatorId, task_type: "weekly_report" }),
          }).catch(() => {});
        }
      }

      // Growth: conversion_optimizer daily at 14:00 UTC (9am ET)
      if (agents.includes("growth") && hour === 14) {
        const today = now.toISOString().slice(0, 10);
        const { count } = await supabase.from("aria_agent_tasks")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", creatorId)
          .eq("task_type", "conversion_optimizer")
          .gte("created_at", today);

        if ((count || 0) === 0) {
          fetch(`${baseUrl}/functions/v1/agent-growth-run`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({ creator_id: creatorId, task_type: "conversion_optimizer" }),
          }).catch(() => {});
        }
      }

      // Community: churn_detection daily at 15:00 UTC (10am ET)
      if (agents.includes("community") && hour === 15) {
        const today = now.toISOString().slice(0, 10);
        const { count } = await supabase.from("aria_agent_tasks")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", creatorId)
          .eq("task_type", "churn_detection")
          .gte("created_at", today);

        if ((count || 0) === 0) {
          fetch(`${baseUrl}/functions/v1/agent-community-run`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
            body: JSON.stringify({ creator_id: creatorId, task_type: "churn_detection" }),
          }).catch(() => {});
        }
      }
    }

    return new Response(JSON.stringify({ success: true, handoffs_processed: handoffs?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("agent-orchestrator error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
