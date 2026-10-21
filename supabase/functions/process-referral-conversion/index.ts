const corsHeaders = { "Access-Control-Allow-Origin": "https://uply.tv", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireInternal, withCors } from "../_shared/security.ts";

Deno.serve(withCors(async (req) => {
  // SECURITY: cron / internal only (x-cron-secret or service-role bearer).
  if (req.method !== 'OPTIONS') {
    const denied = requireInternal(req);
    if (denied) return denied;
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { referral_code, new_member_id, creator_id } = await req.json();
    if (!referral_code || !new_member_id || !creator_id) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find the code
    const { data: codeRow } = await supabase.from("member_referral_codes").select("*").eq("code", referral_code).single();
    if (!codeRow) return new Response(JSON.stringify({ error: "Code not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Insert conversion (ON CONFLICT DO NOTHING)
    const { data: conversion, error: convErr } = await supabase.from("member_referral_conversions").upsert({
      referral_code_id: codeRow.id, referred_user_id: new_member_id, creator_id,
    }, { onConflict: "referral_code_id,referred_user_id" }).select().single();

    if (convErr) return new Response(JSON.stringify({ error: convErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Update conversion count
    await supabase.from("member_referral_codes").update({ conversion_count: (codeRow.conversion_count || 0) + 1 }).eq("id", codeRow.id);

    // Get program config
    const { data: program } = await supabase.from("member_referral_programs").select("*").eq("creator_id", creator_id).eq("is_active", true).single();

    if (program && conversion) {
      // Issue reward
      await supabase.from("member_referral_rewards").insert({
        member_id: codeRow.member_id, creator_id,
        conversion_id: conversion.id,
        reward_type: program.reward_type,
        reward_value: program.reward_value,
        reward_description: program.reward_description,
        expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
      });

      // Notify referring member
      const { data: newMemberProfile } = await supabase.from("profiles").select("display_name").eq("id", new_member_id).single();
      await supabase.from("notifications").insert({
        user_id: codeRow.member_id,
        type: "referral_reward",
        title: "🎁 Referral Reward!",
        message: `${newMemberProfile?.display_name || "Someone"} joined using your referral! You earned a reward.`,
      });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}));
