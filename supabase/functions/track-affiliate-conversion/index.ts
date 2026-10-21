import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkEdgeRateLimit, requestIp } from "../_shared/rateLimit.ts";
import { isInternalCaller, requireUser, withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withCors(async (req) => {
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

    // Unauthenticated endpoint — rate limit per IP (fail-open on infra errors)
    // so a single caller cannot flood click/conversion counters.
    const rlAllowed = await checkEdgeRateLimit(serviceClient, `ip:${requestIp(req)}`, "track-affiliate-conversion", {
      maxCalls: 30,
      windowMs: 60_000,
    });
    if (!rlAllowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please slow down and try again shortly." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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

    // SECURITY (batch 1): conversions can no longer be forged by anonymous callers.
    //  - purchase: server-to-server only (cron secret / service role).
    //  - signup:   caller's JWT must match referred_user_id, OR (no session yet because
    //              email confirmation is pending) the user must be a real account
    //              created in the last 30 minutes. One signup conversion per user.
    const deny = (status: number, error: string) =>
      new Response(JSON.stringify({ error }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (conversion_type === "purchase") {
      if (!isInternalCaller(req)) return deny(403, "Forbidden");
    } else if (conversion_type === "signup") {
      const hasBearer = /^Bearer\s+/i.test(req.headers.get("Authorization") ?? "");
      const authed = hasBearer ? await requireUser(req) : null;
      if (authed && "user" in authed) {
        if (authed.user.id !== referred_user_id) return deny(403, "Forbidden");
      } else {
        const { data: adminUser } = await serviceClient.auth.admin.getUserById(String(referred_user_id));
        const createdAt = adminUser?.user?.created_at ? new Date(adminUser.user.created_at).getTime() : 0;
        if (!createdAt || Date.now() - createdAt > 30 * 60_000) return deny(403, "Forbidden");
      }
      const { data: existing } = await serviceClient
        .from("affiliate_conversions")
        .select("id")
        .eq("referred_user_id", referred_user_id)
        .eq("conversion_type", "signup")
        .limit(1);
      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ success: true, duplicate: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else {
      return deny(400, "Unsupported conversion_type");
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

      // SECURITY: this endpoint is unauthenticated and `amount` is client-supplied,
      // so it MUST NOT move money or mint payable commission. Purchase conversions
      // are recorded as pending with zero commission; the real commission is computed
      // and approved server-side from a Stripe-verified payment (follow-up work).
      await serviceClient.from("affiliate_conversions").insert({
        affiliate_code,
        referred_user_id,
        referring_user_id: platformLink.user_id,
        conversion_type,
        amount: conversion_type === "purchase" ? 0 : Number(amount),
        commission_amount: 0,
        status: "pending",
      });

      // Update link stats
      if (conversion_type === "signup") {
        const { data: linkData } = await serviceClient
          .from("affiliate_links")
          .select("signups")
          .eq("code", affiliate_code)
          .single();
        if (linkData) {
          await serviceClient
            .from("affiliate_links")
            .update({ signups: (linkData.signups || 0) + 1 })
            .eq("code", affiliate_code);
        }
      } else if (conversion_type === "purchase") {
        const { data: linkData } = await serviceClient
          .from("affiliate_links")
          .select("revenue_generated")
          .eq("code", affiliate_code)
          .single();
        if (linkData) {
          await serviceClient
            .from("affiliate_links")
            .update({ revenue_generated: Number(linkData.revenue_generated || 0) + Number(amount) })
            .eq("code", affiliate_code);
        }
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

      // SECURITY: unauthenticated + client-supplied amount — never move money or
      // mint payable commission here. Record a pending, zero-commission conversion;
      // real commission is computed/approved server-side from a verified payment.
      await serviceClient.from("affiliate_conversions").insert({
        affiliate_code,
        referred_user_id,
        referring_user_id: creatorMember.member_id,
        conversion_type,
        amount: conversion_type === "purchase" ? 0 : Number(amount),
        commission_amount: 0,
        status: "pending",
      });

      // Update member conversion count (no earnings credited from this endpoint)
      const { data: memberData } = await serviceClient
        .from("creator_affiliate_members")
        .select("conversions")
        .eq("id", creatorMember.id)
        .single();

      if (memberData) {
        await serviceClient
          .from("creator_affiliate_members")
          .update({ conversions: (memberData.conversions || 0) + 1 })
          .eq("id", creatorMember.id);
      }

      return new Response(JSON.stringify({ success: true, type: "creator" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Affiliate code not found" }), { status: 404, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}));
