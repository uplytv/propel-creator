// Weekly ARIA Growth Assistant reminder.
// For each creator with a growth_plan, insert an in-app notification linking to
// /aria/growth-assistant. Idempotent per ISO week via reference_id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireInternal, withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isoWeekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

Deno.serve(withCors(async (req) => {
  // SECURITY: cron / internal only (x-cron-secret or service-role bearer).
  if (req.method !== 'OPTIONS') {
    const denied = requireInternal(req);
    if (denied) return denied;
  }
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const week = isoWeekKey();
    const refPrefix = `aria-weekly-${week}`;

    const { data: plans, error: planErr } = await supabase
      .from("growth_plans")
      .select("creator_id, title");
    if (planErr) throw planErr;

    let inserted = 0, skipped = 0;
    for (const p of plans ?? []) {
      const reference_id = `${refPrefix}:${p.creator_id}`;

      // Dedup: skip if a row already exists for this week+user
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", p.creator_id)
        .eq("reference_id", reference_id)
        .maybeSingle();
      if (existing) { skipped++; continue; }

      const { error: insErr } = await supabase.from("notifications").insert({
        user_id: p.creator_id,
        type: "aria_weekly_reminder",
        title: "Your weekly Growth Assistant is ready",
        message: "ARIA picked 3 high-leverage moves across plan, outreach, content, and monetization. Tap to start.",
        link: "/aria/growth-assistant",
        reference_id,
      });
      if (insErr) { console.error("insert", p.creator_id, insErr); continue; }
      inserted++;
    }

    return new Response(JSON.stringify({ ok: true, week, inserted, skipped, total: plans?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("aria-weekly-reminder", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}));
