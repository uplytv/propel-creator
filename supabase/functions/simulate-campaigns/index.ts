import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternal, withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(withCors(async (req) => {
  // SECURITY: cron / internal only (x-cron-secret or service-role bearer).
  if (req.method !== 'OPTIONS') {
    const denied = requireInternal(req);
    if (denied) return denied;
  }
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch all active campaigns
    const { data: campaigns, error: fetchError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "active");

    if (fetchError) throw fetchError;
    if (!campaigns || campaigns.length === 0) {
      return new Response(JSON.stringify({ message: "No active campaigns" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates = [];
    const notifications = [];
    const metricsSnapshots = [];

    for (const campaign of campaigns) {
      const dailyBudget = Number(campaign.daily_budget);
      const totalBudget = Number(campaign.total_budget);
      const currentSpent = Number(campaign.spent);
      const prevPct = totalBudget > 0 ? (currentSpent / totalBudget) * 100 : 0;

      // If already spent the full budget, mark as completed
      if (currentSpent >= totalBudget) {
        updates.push(
          supabase
            .from("campaigns")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("id", campaign.id)
        );
        // Completion notification
        notifications.push({
          user_id: campaign.user_id,
          campaign_id: campaign.id,
          type: "campaign_completed",
          title: "🏁 Campaign Completed",
          message: `"${campaign.stream_title}" has finished — $${currentSpent.toFixed(0)} spent of $${totalBudget.toFixed(0)} budget.`,
        });
        continue;
      }

      // Simulate a per-minute tick
      const tickFraction = 1 / 60;
      const spendIncrement = Math.min(
        dailyBudget * tickFraction * (0.8 + Math.random() * 0.4),
        totalBudget - currentSpent
      );

      // Metrics based on objective and budget
      const cpmBase = campaign.objective === "awareness" ? 4 : campaign.objective === "conversions" ? 12 : 8;
      const ctrBase = campaign.objective === "awareness" ? 1.2 : campaign.objective === "conversions" ? 3.5 : 4.0;
      const convRateBase = campaign.objective === "conversions" ? 5.5 : campaign.objective === "leads" ? 4.0 : 1.0;

      const cpm = cpmBase * (0.85 + Math.random() * 0.3);
      const newImpressions = Math.round((spendIncrement / cpm) * 1000);
      const ctr = ctrBase * (0.8 + Math.random() * 0.4);
      const newClicks = Math.max(1, Math.round(newImpressions * (ctr / 100)));
      const convRate = convRateBase * (0.7 + Math.random() * 0.6);
      const newConversions = Math.max(0, Math.round(newClicks * (convRate / 100)));

      const totalSpent = currentSpent + spendIncrement;
      const totalImpressions = campaign.impressions + newImpressions;
      const totalClicks = campaign.clicks + newClicks;
      const totalConversions = campaign.conversions + newConversions;

      const newPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

      // Check if we just crossed 75% threshold
      if (prevPct < 75 && newPct >= 75) {
        notifications.push({
          user_id: campaign.user_id,
          campaign_id: campaign.id,
          type: "budget_warning",
          title: "⚠️ Budget Alert",
          message: `"${campaign.stream_title}" has used ${Math.round(newPct)}% of its $${totalBudget.toFixed(0)} budget.`,
        });
      }

      // Check if we just crossed 80% threshold
      if (prevPct < 80 && newPct >= 80) {
        notifications.push({
          user_id: campaign.user_id,
          campaign_id: campaign.id,
          type: "budget_warning",
          title: "🔴 80% Budget Warning",
          message: `"${campaign.stream_title}" has used ${Math.round(newPct)}% of its $${totalBudget.toFixed(0)} budget. Consider pausing or increasing your budget.`,
        });
      }

      // Check if campaign just completed
      if (totalSpent >= totalBudget) {
        notifications.push({
          user_id: campaign.user_id,
          campaign_id: campaign.id,
          type: "campaign_completed",
          title: "🏁 Campaign Completed",
          message: `"${campaign.stream_title}" has finished — $${totalSpent.toFixed(0)} spent of $${totalBudget.toFixed(0)} budget.`,
        });
      }

      const computedCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const computedCpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
      const computedCpa = totalConversions > 0 ? totalSpent / totalConversions : 0;
      const avgOrderValue = 25 + Math.random() * 20;
      const computedRoas = totalSpent > 0 ? (totalConversions * avgOrderValue) / totalSpent : 0;

      updates.push(
        supabase
          .from("campaigns")
          .update({
            spent: Math.round(totalSpent * 100) / 100,
            impressions: totalImpressions,
            clicks: totalClicks,
            conversions: totalConversions,
            ctr: Math.round(computedCtr * 100) / 100,
            cpc: Math.round(computedCpc * 100) / 100,
            cpa: Math.round(computedCpa * 100) / 100,
            roas: Math.round(computedRoas * 10) / 10,
            updated_at: new Date().toISOString(),
            ...(totalSpent >= totalBudget ? { status: "completed" } : {}),
          })
          .eq("id", campaign.id)
      );
      // Record metrics snapshot
      metricsSnapshots.push({
        campaign_id: campaign.id,
        user_id: campaign.user_id,
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        spent: Math.round(totalSpent * 100) / 100,
      });
    }
    // Filter notifications based on user preferences
    if (notifications.length > 0) {
      const userIds = [...new Set(notifications.map(n => n.user_id))];
      const { data: prefsData } = await supabase
        .from("notification_preferences")
        .select("user_id, budget_warning, campaign_completed")
        .in("user_id", userIds);

      const prefsMap = new Map(
        (prefsData || []).map((p: any) => [p.user_id, p])
      );

      const filteredNotifs = notifications.filter(n => {
        const userPrefs = prefsMap.get(n.user_id);
        // Default to true if no preferences row exists
        if (!userPrefs) return true;
        if (n.type === "budget_warning") return userPrefs.budget_warning;
        if (n.type === "campaign_completed") return userPrefs.campaign_completed;
        return true;
      });

      if (filteredNotifs.length > 0) {
        const { error: notifError } = await supabase
          .from("campaign_notifications")
          .insert(filteredNotifs);
        if (notifError) {
          console.error("Failed to insert notifications:", notifError);
        }
      }
    }

    // Insert metrics snapshots
    if (metricsSnapshots.length > 0) {
      const { error: metricsError } = await supabase
        .from("campaign_metrics")
        .insert(metricsSnapshots);
      if (metricsError) {
        console.error("Failed to insert metrics:", metricsError);
      }
    }

    const results = await Promise.all(updates);
    const errors = results.filter((r) => r.error);

    return new Response(
      JSON.stringify({
        updated: results.length - errors.length,
        errors: errors.length,
        notifications_sent: notifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
