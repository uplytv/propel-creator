import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { affiliate_code, referred_user_id, conversion_type, amount = 0 } = body;

    if (!affiliate_code || !conversion_type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
    }

    // ── Click tracking (no referred_user_id needed) ──
    if (conversion_type === "click") {
      // Try platform link first
      const { data: platformLink } = await serviceClient
        .from("affiliate_links")
        .select("clicks")
        .eq("code", affiliate_code)
        .maybeSingle();

      if (platformLink) {
        await serviceClient
          .from("affiliate_links")
          .update({ clicks: (platformLink.clicks || 0) + 1 })
          .eq("code", affiliate_code);
        return new Response(JSON.stringify({ success: true, type: "platform_click" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Try creator affiliate member
      const { data: creatorMember } = await serviceClient
        .from("creator_affiliate_members")
        .select("id, clicks")
        .eq("affiliate_code", affiliate_code)
        .maybeSingle();

      if (creatorMember) {
        await serviceClient
          .from("creator_affiliate_members")
          .update({ clicks: (creatorMember.clicks || 0) + 1 })
          .eq("id", creatorMember.id);
        return new Response(JSON.stringify({ success: true, type: "creator_click" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Unknown code — still OK, cookie was set
      return new Response(JSON.stringify({ success: true, type: "unknown_click" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Conversion tracking (signup/purchase) — requires referred_user_id ──
    if (!referred_user_id) {
      return new Response(JSON.stringify({ error: "Missing referred_user_id" }), { status: 400, headers: corsHeaders });
    }

    // Check platform affiliate links first
    const { data: platformLink } = await serviceClient
      .from("affiliate_links")
      .select("user_id")
      .eq("code", affiliate_code)
      .maybeSingle();

    if (platformLink) {
      // Self-referral check
      if (platformLink.user_id === referred_user_id) {
        return new Response(JSON.stringify({ error: "Self-referral not allowed" }), { status: 400, headers: corsHeaders });
      }

      const commissionAmount = conversion_type === "purchase" ? Number(amount) * 0.2 : 0;

      // Insert conversion
      await serviceClient.from("affiliate_conversions").insert({
        affiliate_code,
        referred_user_id,
        referring_user_id: platformLink.user_id,
        conversion_type,
        amount: Number(amount),
        commission_amount: commissionAmount,
        status: "pending",
      });

      // Update link stats
      if (conversion_type === "signup") {
        await serviceClient
          .from("affiliate_links")
          .update({ signups: platformLink.user_id ? undefined : 0 })
          .eq("code", affiliate_code);
        // Use RPC-style increment
        await serviceClient.rpc("increment_affiliate_signups" as any, { p_code: affiliate_code }).catch(() => {
          // Fallback: manual update
          serviceClient
            .from("affiliate_links")
            .select("signups")
            .eq("code", affiliate_code)
            .single()
            .then(({ data }) => {
              if (data) {
                serviceClient
                  .from("affiliate_links")
                  .update({ signups: (data.signups || 0) + 1 })
                  .eq("code", affiliate_code);
              }
            });
        });
      } else if (conversion_type === "purchase") {
        serviceClient
          .from("affiliate_links")
          .select("revenue_generated")
          .eq("code", affiliate_code)
          .single()
          .then(({ data }) => {
            if (data) {
              serviceClient
                .from("affiliate_links")
                .update({ revenue_generated: Number(data.revenue_generated || 0) + Number(amount) })
                .eq("code", affiliate_code);
            }
          });
      }

      return new Response(JSON.stringify({ success: true, type: "platform" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check creator affiliate members
    const { data: creatorMember } = await serviceClient
      .from("creator_affiliate_members")
      .select("id, member_id, program_id")
      .eq("affiliate_code", affiliate_code)
      .maybeSingle();

    if (creatorMember) {
      if (creatorMember.member_id === referred_user_id) {
        return new Response(JSON.stringify({ error: "Self-referral not allowed" }), { status: 400, headers: corsHeaders });
      }

      // Get program commission rate
      const { data: program } = await serviceClient
        .from("creator_affiliate_programs")
        .select("commission_rate, creator_id")
        .eq("id", creatorMember.program_id)
        .single();

      const rate = program?.commission_rate || 20;
      const commissionAmount = Number(amount) * (rate / 100);

      await serviceClient.from("affiliate_conversions").insert({
        affiliate_code,
        referred_user_id,
        referring_user_id: creatorMember.member_id,
        conversion_type,
        amount: Number(amount),
        commission_amount: commissionAmount,
        status: "pending",
      });

      // Update member stats
      const { data: memberData } = await serviceClient
        .from("creator_affiliate_members")
        .select("conversions, earnings")
        .eq("id", creatorMember.id)
        .single();

      if (memberData) {
        await serviceClient
          .from("creator_affiliate_members")
          .update({
            conversions: (memberData.conversions || 0) + 1,
            earnings: Number(memberData.earnings || 0) + commissionAmount,
          })
          .eq("id", creatorMember.id);
      }

      return new Response(JSON.stringify({ success: true, type: "creator" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Affiliate code not found" }), { status: 404, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
