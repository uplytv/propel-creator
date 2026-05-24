import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = () => Deno.env.get("RESEND_API_KEY")!;
const supabaseClient = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function unsubLink(email: string) {
  return `https://uply.tv/unsubscribe?email=${encodeURIComponent(email)}`;
}
function footer(email: string) {
  return `<div style="padding:24px 28px;border-top:1px solid #1E1E1E;text-align:center;"><a href="${unsubLink(email)}" style="color:#555;font-size:11px;text-decoration:underline;">Unsubscribe</a><span style="color:#333;font-size:11px;"> · </span><span style="color:#555;font-size:11px;">Powered by UPLY</span></div>`;
}
function wrap(inner: string, email: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background-color:#0A0A0A;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;"><div style="max-width:600px;margin:0 auto;background-color:#0A0A0A;"><div style="height:4px;background-color:#00FF85;"></div>${inner}${footer(email)}</div></body></html>`;
}
function card(inner: string) {
  return `<div style="background:#111111;border:1px solid #1E1E1E;border-radius:12px;padding:24px;margin:20px 0;">${inner}</div>`;
}
function cta(text: string, href: string) {
  return `<div style="text-align:center;margin:28px 0;"><a href="${href}" style="display:inline-block;background:#00FF85;color:#000000;font-weight:700;font-size:15px;padding:14px 28px;border-radius:6px;text-decoration:none;">${text}</a></div>`;
}

async function logEmail(supabase: any, p: { template_name: string; recipient_email: string; status: string; error_message?: string; metadata?: any }) {
  await supabase.from("email_send_log").insert({
    message_id: `${p.template_name}-${crypto.randomUUID().slice(0, 12)}`,
    template_name: p.template_name, recipient_email: p.recipient_email, status: p.status,
    error_message: p.error_message || null, metadata: p.metadata || null,
  });
}

async function sendEmail(supabase: any, opts: { to: string; subject_a: string; subject_b: string; preview_text: string; html: string; text: string; template_name: string; metadata?: any }) {
  const { data: suppressed } = await supabase.rpc("is_email_suppressed", { p_email: opts.to });
  if (suppressed) { await logEmail(supabase, { template_name: opts.template_name, recipient_email: opts.to, status: "suppressed", metadata: opts.metadata }); return; }
  const ab_variant = Math.floor(Math.random() * 2) === 0 ? "a" : "b";
  const subject = ab_variant === "a" ? opts.subject_a : opts.subject_b;
  const previewHtml = `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${opts.preview_text}</div>` + opts.html;
  try {
    const res = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Authorization": `Bearer ${RESEND_API_KEY()}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: "UPLY <noreply@notify.uply.tv>", to: [opts.to], subject, html: previewHtml, text: opts.text }) });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || JSON.stringify(result));
    await logEmail(supabase, { template_name: opts.template_name, recipient_email: opts.to, status: "sent", metadata: { ...opts.metadata, ab_variant, subject, message_id: result.id } });
  } catch (error: any) {
    await logEmail(supabase, { template_name: opts.template_name, recipient_email: opts.to, status: "failed", error_message: error.message, metadata: { ...opts.metadata, ab_variant } });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Internal-only: require service-role bearer token. Callers (stripe-webhook,
    // pg_cron, etc.) already pass SUPABASE_SERVICE_ROLE_KEY.
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    if (!bearer || bearer !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { event_type, member_id, creator_id, subscription_id, module_name, lesson_count } = body;
    const supabase = supabaseClient();

    // Get member email
    const { data: { user: memberAuth } } = await supabase.auth.admin.getUserById(member_id);
    if (!memberAuth?.email) return new Response(JSON.stringify({ error: "No email" }), { status: 400, headers: corsHeaders });
    const email = memberAuth.email;

    // Get profiles
    const { data: memberProfile } = await supabase.from("profiles").select("display_name, first_name").eq("user_id", member_id).single();
    const { data: creatorProfile } = await supabase.from("profiles").select("display_name, username").eq("user_id", creator_id).single();
    const memberFirstName = (memberProfile?.display_name || memberProfile?.first_name || "there").split(" ")[0];
    const creatorName = creatorProfile?.display_name || creatorProfile?.username || "your creator";
    const meta = { member_id, creator_id };

    switch (event_type) {
      case "member_welcome": {
        // Get subscription info
        const { data: sub } = await supabase.from("member_subscriptions").select("*, subscription_tiers(name, price, features)").eq("id", subscription_id).single();
        if (sub?.member_welcome_email_sent_at) break;
        const tierName = sub?.subscription_tiers?.name || "Community";
        const amount = sub?.subscription_tiers?.price || 0;

        const text = `Welcome to ${creatorName}'s community, ${memberFirstName}! 🎉\n\nYour ${tierName} membership is active.\n\nHere's where to start:\n→ Explore the community: https://uply.tv/community/${creator_id}/community\n→ Browse the classroom: https://uply.tv/community/${creator_id}/classroom\n→ Manage your subscription: https://uply.tv/settings\n\nUnsubscribe: ${unsubLink(email)}`;

        const html = wrap(`<div style="padding:32px 28px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:48px;margin-bottom:12px;">🎉</div>
            <h1 style="color:#ffffff;font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin:0 0 8px;">Welcome to ${creatorName}'s community!</h1>
            <p style="color:#888;font-size:14px;margin:0;">${tierName} membership${amount > 0 ? ` · $${amount}/mo` : ""}</p>
          </div>
          ${card(`<div>
            <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 12px;">Get started:</p>
            <p style="color:#CCCCCC;font-size:13px;margin:0 0 8px;">👥 <a href="https://uply.tv/community/${creator_id}/community" style="color:#00FF85;">Explore the community →</a></p>
            <p style="color:#CCCCCC;font-size:13px;margin:0 0 8px;">📚 <a href="https://uply.tv/community/${creator_id}/classroom" style="color:#00FF85;">Browse the classroom →</a></p>
            <p style="color:#CCCCCC;font-size:13px;margin:0;">⚙️ <a href="https://uply.tv/settings" style="color:#00FF85;">Manage subscription →</a></p>
          </div>`)}
          ${cta("Start Exploring →", `https://uply.tv/community/${creator_id}/community`)}
        </div>`, email);

        await sendEmail(supabase, { to: email, subject_a: `Welcome to ${creatorName}'s community 🎉`, subject_b: `You're in, ${memberFirstName}. Here's where to start in ${creatorName}'s community.`, preview_text: `3 lessons to start with, based on your profile. Plus: what other members are doing this week.`, html, text, template_name: "member_welcome_v2", metadata: meta });
        if (subscription_id) await supabase.from("member_subscriptions").update({ member_welcome_email_sent_at: new Date().toISOString() }).eq("id", subscription_id);
        break;
      }
      case "member_day_3": {
        const { data: sub } = await supabase.from("member_subscriptions").select("member_day3_email_sent_at").eq("id", subscription_id).single();
        if (sub?.member_day3_email_sent_at) break;

        const text = `Hi ${memberFirstName},\n\n3 days in. Have you explored ${creatorName}'s community yet?\n\nMost active members start within 72 hours.\n\n→ Explore: https://uply.tv/community/${creator_id}/community\n\nUnsubscribe: ${unsubLink(email)}`;
        const html = wrap(`<div style="padding:32px 28px;">
          <h1 style="color:#ffffff;font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin:0 0 16px;">${memberFirstName} — have you explored yet?</h1>
          ${card(`<p style="color:#CCCCCC;font-size:14px;line-height:1.6;margin:0;">Most active members start within <strong style="color:#00FF85;">72 hours</strong>. Jump in now.</p>`)}
          ${cta("Explore Community →", `https://uply.tv/community/${creator_id}/community`)}
        </div>`, email);

        await sendEmail(supabase, { to: email, subject_a: `${memberFirstName} — have you explored ${creatorName}'s community yet?`, subject_b: `3 days in. Here's what other members are doing in ${creatorName}'s community.`, preview_text: `Most active members start within 72 hours. Here's the most popular lesson this week.`, html, text, template_name: "member_day_3", metadata: meta });
        if (subscription_id) await supabase.from("member_subscriptions").update({ member_day3_email_sent_at: new Date().toISOString() }).eq("id", subscription_id);
        break;
      }
      case "member_renewal_reminder": {
        const { data: sub } = await supabase.from("member_subscriptions").select("current_period_end, subscription_tiers(name, price)").eq("id", subscription_id).single();
        const renewDate = sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "soon";
        const amt = sub?.subscription_tiers?.price || 0;

        const text = `Hi ${memberFirstName},\n\nYour ${creatorName} membership ($${amt}/mo) renews on ${renewDate}.\n\nManage: https://uply.tv/settings\n\nUnsubscribe: ${unsubLink(email)}`;
        const html = wrap(`<div style="padding:32px 28px;">
          <h1 style="color:#ffffff;font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin:0 0 16px;">Renewal reminder</h1>
          ${card(`<div>
            <p style="color:#CCCCCC;font-size:14px;margin:0 0 8px;">Your <strong style="color:#ffffff;">${creatorName}</strong> membership</p>
            <p style="color:#00FF85;font-size:20px;font-weight:700;margin:0 0 4px;">$${amt}/mo</p>
            <p style="color:#888;font-size:13px;margin:0;">Renews ${renewDate}</p>
          </div>`)}
          ${cta("Manage Subscription →", "https://uply.tv/settings")}
        </div>`, email);

        await sendEmail(supabase, { to: email, subject_a: `Your ${creatorName} membership renews in 3 days`, subject_b: `Quick heads up — $${amt} renews on ${renewDate} for ${creatorName}'s community`, preview_text: `Here's what you've accessed this month and what's coming up in ${creatorName}'s community.`, html, text, template_name: "member_renewal_reminder", metadata: meta });
        if (subscription_id) await supabase.from("member_subscriptions").update({ member_renewal_reminder_sent_at: new Date().toISOString() }).eq("id", subscription_id);
        break;
      }
      case "member_module_complete": {
        const modName = module_name || "a module";
        const lCount = lesson_count || 0;

        const text = `🏆 You completed ${modName}!\n\nAll ${lCount} lessons done. ${creatorName} would be proud.\n\n→ Continue learning: https://uply.tv/community/${creator_id}/classroom\n\nUnsubscribe: ${unsubLink(email)}`;
        const html = wrap(`<div style="padding:32px 28px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:48px;margin-bottom:12px;">🏆</div>
            <h1 style="color:#ffffff;font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin:0 0 8px;">Module Complete!</h1>
            <p style="color:#888;font-size:14px;margin:0;">${modName} · ${lCount} lessons</p>
          </div>
          ${card(`<p style="color:#CCCCCC;font-size:14px;line-height:1.6;margin:0;">You finished all ${lCount} lessons. <strong style="color:#00FF85;">${creatorName}</strong> would be proud. Check out the next module!</p>`)}
          ${cta("Continue Learning →", `https://uply.tv/community/${creator_id}/classroom`)}
        </div>`, email);

        await sendEmail(supabase, { to: email, subject_a: `🏆 You completed ${modName} — ${creatorName} would be proud`, subject_b: `Module complete, ${memberFirstName}. Here's what you just learned and what's next.`, preview_text: `You finished all ${lCount} lessons. Here's your next module and a win worth sharing.`, html, text, template_name: "member_module_complete", metadata: { ...meta, module_name: modName } });
        break;
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("send-member-lifecycle-emails error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
