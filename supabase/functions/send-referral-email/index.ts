import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { requireUser, serviceClient, strictRateLimit, withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildReferrerEmailHtml(params: {
  referrerName: string;
  applicantName: string;
  newCount: number;
  position: number;
  referralLink: string;
}) {
  const { referrerName, applicantName, newCount, position, referralLink } = params;
  const remaining = Math.max(0, 25 - newCount);
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;"><tr><td align="center" style="padding:40px 20px;">
<table width="100%" style="max-width:520px;background:#0A0A0A;border-radius:16px;overflow:hidden;">
<tr><td style="padding:40px 32px 24px;text-align:center;">
  <div style="font-size:48px;margin-bottom:16px;">🎉</div>
  <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px;">${applicantName} just joined!</h1>
  <p style="color:#999;font-size:14px;margin:0;">They used your personal invite link</p>
</td></tr>
<tr><td style="padding:0 32px 24px;">
  <table width="100%" style="background:#111;border:1px solid #00FF85;border-radius:12px;">
  <tr><td style="padding:24px;text-align:center;">
    <p style="color:#999;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">Your Stats</p>
    <p style="color:#00FF85;font-size:36px;font-weight:800;margin:0;">${newCount} referral${newCount !== 1 ? "s" : ""}</p>
    <p style="color:#999;font-size:13px;margin:8px 0 0;">Position #${position}${remaining > 0 ? ` · ${remaining} more to Founding Creator` : " · 👑 Founding Creator!"}</p>
  </td></tr></table>
</td></tr>
<tr><td style="padding:0 32px 32px;text-align:center;">
  <a href="${referralLink}" style="display:inline-block;background:#00FF85;color:#0A0A0A;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;">Share Again →</a>
  <p style="color:#666;font-size:12px;margin:16px 0 0;">Keep sharing to move up faster</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function buildWelcomeEmailHtml(params: {
  applicantName: string;
  position: number;
  referralLink: string;
  total: number;
}) {
  const { applicantName, position, referralLink, total } = params;
  const topPercent = total > 0 ? Math.max(1, Math.round((position / total) * 100)) : 100;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;"><tr><td align="center" style="padding:40px 20px;">
<table width="100%" style="max-width:520px;background:#0A0A0A;border-radius:16px;overflow:hidden;">
<tr><td style="padding:40px 32px 24px;text-align:center;">
  <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 8px;">Welcome to the waitlist, ${applicantName}!</h1>
  <p style="color:#999;font-size:14px;margin:0;">You're officially in line for early access to UPLY</p>
</td></tr>
<tr><td style="padding:0 32px 24px;">
  <table width="100%" style="background:#111;border:2px solid #00FF85;border-radius:14px;">
  <tr><td style="padding:32px;text-align:center;">
    <p style="color:#999;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">YOUR WAITLIST POSITION</p>
    <p style="color:#00FF85;font-size:64px;font-weight:800;margin:0;font-family:'Space Grotesk','Helvetica Neue',sans-serif;">#${position}</p>
    <p style="color:#999;font-size:13px;margin:8px 0 0;">out of ${total.toLocaleString()} creators · Top ${topPercent}%</p>
  </td></tr></table>
</td></tr>
<tr><td style="padding:0 32px 8px;">
  <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 8px;">Move up faster:</p>
  <p style="color:#999;font-size:13px;margin:0 0 4px;">🥉 3 referrals → Jump 30 spots</p>
  <p style="color:#999;font-size:13px;margin:0 0 4px;">🥈 10 referrals → Top 100 guaranteed</p>
  <p style="color:#999;font-size:13px;margin:0 0 16px;">🥇 25 referrals → Founding Creator (Founding Rate Lock — 95% payout for life)</p>
</td></tr>
<tr><td style="padding:0 32px 32px;text-align:center;">
  <a href="${referralLink}" style="display:inline-block;background:#00FF85;color:#0A0A0A;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;">Share Your Invite Link →</a>
  <p style="color:#666;font-size:12px;margin:16px 0 0;">Every creator you refer moves you up 10 spots</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: only signed-in users (Onboarding) may trigger these emails; fails closed.
    const auth = await requireUser(req);
    if ("response" in auth) return auth.response;
    if (!(await strictRateLimit(serviceClient(), `user:${auth.user.id}`, "send-referral-email", 5, 60 * 60_000))) {
      return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { type, ...params } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (type === "referrer_notification") {
      const { referrerWaitlistId, applicantName, applicantCreatorType } = params;
      // Delegate to send-waitlist-emails for enhanced referrer notification
      const waitlistEmailUrl = `${supabaseUrl}/functions/v1/send-waitlist-emails`;
      await fetch(waitlistEmailUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          event_type: "referrer_notified",
          waitlist_id: referrerWaitlistId,
          applicant_name: applicantName,
          applicant_creator_type: applicantCreatorType || "Creator",
        }),
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "welcome_applicant") {
      const { waitlistId } = params;
      // Delegate to send-waitlist-emails for enhanced welcome
      const waitlistEmailUrl = `${supabaseUrl}/functions/v1/send-waitlist-emails`;
      await fetch(waitlistEmailUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          event_type: "waitlist_confirmation",
          waitlist_id: waitlistId,
        }),
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown type" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-referral-email error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
