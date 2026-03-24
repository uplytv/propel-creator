import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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
  <p style="color:#999;font-size:13px;margin:0 0 16px;">🥇 25 referrals → Founding Creator (0% fees forever)</p>
</td></tr>
<tr><td style="padding:0 32px 32px;text-align:center;">
  <a href="${referralLink}" style="display:inline-block;background:#00FF85;color:#0A0A0A;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;">Share Your Invite Link →</a>
  <p style="color:#666;font-size:12px;margin:16px 0 0;">Every creator you refer moves you up 10 spots</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, ...params } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (type === "referrer_notification") {
      const { referrerEmail, referrerName, applicantName, newCount, position, referralLink } = params;
      const html = buildReferrerEmailHtml({ referrerName, applicantName, newCount, position, referralLink });
      const messageId = `ref-notify-${crypto.randomUUID().slice(0, 12)}`;

      await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          run_id: crypto.randomUUID(),
          to: referrerEmail,
          from: "UPLY <hello@notify.uply.tv>",
          sender_domain: "notify.uply.tv",
          subject: `🎉 ${applicantName.split(" ")[0]} just joined your waitlist!`,
          html,
          text: `${applicantName} used your invite link! Your referral count is now ${newCount}.`,
          purpose: "transactional",
          label: "referrer-notification",
          message_id: messageId,
          idempotency_key: messageId,
          queued_at: new Date().toISOString(),
        },
      });

      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "referrer-notification",
        recipient_email: referrerEmail,
        status: "pending",
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "welcome_applicant") {
      const { applicantEmail, applicantName, position, referralLink, total } = params;
      const html = buildWelcomeEmailHtml({ applicantName, position, referralLink, total });
      const messageId = `welcome-${crypto.randomUUID().slice(0, 12)}`;

      await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          run_id: crypto.randomUUID(),
          to: applicantEmail,
          from: "UPLY <hello@notify.uply.tv>",
          sender_domain: "notify.uply.tv",
          subject: `You're on the UPLY waitlist — here's your spot`,
          html,
          text: `Welcome to the UPLY waitlist! Your position is #${position}. Share your link to move up: ${referralLink}`,
          purpose: "transactional",
          label: "welcome-applicant",
          message_id: messageId,
          idempotency_key: messageId,
          queued_at: new Date().toISOString(),
        },
      });

      await supabase.from("email_send_log").insert({
        message_id: messageId,
        template_name: "welcome-applicant",
        recipient_email: applicantEmail,
        status: "pending",
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
});
