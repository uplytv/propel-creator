const corsHeaders = { "Access-Control-Allow-Origin": "https://uply.tv", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isInternalCaller, requireUser, withCors } from "../_shared/security.ts";

Deno.serve(withCors(async (req) => {
  // SECURITY: signed-in users (or internal callers) only.
  if (req.method !== 'OPTIONS' && !isInternalCaller(req)) {
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { creator_id } = await req.json();
    if (!creator_id) return new Response(JSON.stringify({ error: "creator_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get creator's profile user_id
    const { data: profile } = await supabase.from("profiles").select("user_id").eq("id", creator_id).single();
    if (!profile) return new Response(JSON.stringify({ error: "Creator not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Get community members
    const { data: members } = await supabase.from("community_members").select("user_id, joined_at").eq("creator_id", profile.user_id);
    if (!members?.length) return new Response(JSON.stringify({ predictions: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const memberIds = members.map((m: any) => m.user_id);

    // Get last activity from profiles
    const { data: profiles } = await supabase.from("profiles").select("id, user_id, updated_at, display_name").in("user_id", memberIds);
    const profileMap = new Map<string, any>();
    profiles?.forEach((p: any) => profileMap.set(p.user_id, p));

    // Get last community posts/comments
    const { data: posts } = await supabase.from("community_posts").select("author_id, created_at").in("author_id", memberIds).order("created_at", { ascending: false });
    const lastPostMap = new Map<string, string>();
    posts?.forEach((p: any) => { if (!lastPostMap.has(p.author_id)) lastPostMap.set(p.author_id, p.created_at); });

    const now = Date.now();
    let upserted = 0;

    for (const member of members) {
      const prof = profileMap.get(member.user_id);
      if (!prof) continue;

      const lastPost = lastPostMap.get(member.user_id);
      const lastActive = lastPost ? new Date(lastPost).getTime() : new Date(prof.updated_at || member.joined_at).getTime();
      const daysSince = Math.floor((now - lastActive) / 86400000);

      let churnProb: number;
      let riskLevel: string;

      if (daysSince > 30) { churnProb = 0.8; riskLevel = "critical"; }
      else if (daysSince > 14) { churnProb = 0.5; riskLevel = "high"; }
      else if (daysSince > 7) { churnProb = 0.25; riskLevel = "medium"; }
      else if (daysSince > 3) { churnProb = 0.1; riskLevel = "low"; }
      else { churnProb = 0.02; riskLevel = "low"; }

      await supabase.from("member_churn_predictions").upsert({
        member_id: prof.id, creator_id, churn_probability: churnProb,
        risk_level: riskLevel, days_since_last_active: daysSince,
        engagement_score: Math.max(0, 1 - churnProb), calculated_at: new Date().toISOString(),
      }, { onConflict: "member_id,creator_id" });
      upserted++;
    }

    return new Response(JSON.stringify({ predictions: upserted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}));
