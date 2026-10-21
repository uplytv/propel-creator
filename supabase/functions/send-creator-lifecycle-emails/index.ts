import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = () => Deno.env.get("RESEND_API_KEY")!;
const supabaseClient = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function unsubLink(email: string) {
  return `https://uply.tv/unsubscribe?email=${encodeURIComponent(email)}`;
}

function footer(email: string) {
  return `<div style="padding:24px 28px;border-top:1px solid #1E1E1E;text-align:center;">
    <a href="${unsubLink(email)}" style="color:#555;font-size:11px;text-decoration:underline;">Unsubscribe</a>
    <span style="color:#333;font-size:11px;"> · </span>
    <span style="color:#555;font-size:11px;">Powered by UPLY</span>
  </div>`;
}

function wrap(inner: string, email: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;">
<div style="max-width:600px;margin:0 auto;background-color:#0A0A0A;">
<div style="height:4px;background-color:#00FF85;"></div>
${inner}
${footer(email)}
</div></body></html>`;
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
    template_name: p.template_name,
    recipient_email: p.recipient_email,
    status: p.status,
    error_message: p.error_message || null,
    metadata: p.metadata || null,
  });
}

async function sendEmail(supabase: any, opts: {
  to: string; subject_a: string; subject_b: string; preview_text: string; html: string; text: string; template_name: string; metadata?: any;
}) {
  const { data: suppressed } = await supabase.rpc("is_email_suppressed", { p_email: opts.to });
  if (suppressed) {
    await logEmail(supabase, { template_name: opts.template_name, recipient_email: opts.to, status: "suppressed", metadata: opts.metadata });
    return;
  }
  const ab_variant = Math.floor(Math.random() * 2) === 0 ? "a" : "b";
  const subject = ab_variant === "a" ? opts.subject_a : opts.subject_b;
  const previewHtml = `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${opts.preview_text}</div>` + opts.html;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "UPLY <noreply@notify.uply.tv>", to: [opts.to], subject, html: previewHtml, text: opts.text }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || JSON.stringify(result));
    await logEmail(supabase, { template_name: opts.template_name, recipient_email: opts.to, status: "sent", metadata: { ...opts.metadata, ab_variant, subject, message_id: result.id } });
  } catch (error: any) {
    await logEmail(supabase, { template_name: opts.template_name, recipient_email: opts.to, status: "failed", error_message: error.message, metadata: { ...opts.metadata, ab_variant } });
  }
}

Deno.serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { event_type, user_id, member_name, amount, platform_fee, milestone_amount, stream_title, stream_duration } = body;
    const supabase = supabaseClient();

    const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user_id).single();
    if (!profile) return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: corsHeaders });

    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(user_id);
    if (!authUser?.email) return new Response(JSON.stringify({ error: "No email" }), { status: 400, headers: corsHeaders });

    const email = authUser.email;
    const firstName = (profile.display_name || profile.first_name || "Creator").split(" ")[0];
    const meta = { creator_id: user_id };

    switch (event_type) {
      case "creator_welcome": {
        if (profile.welcome_email_sent_at) break;
        const text = `Hi ${firstName},\n\nWelcome to UPLY! 🚀\n\nHere's how to get started:\n1. Create your space: https://uply.tv/dashboard\n2. Set your price: https://uply.tv/products\n3. Go live: https://uply.tv/go-live\n4. Check your AI team: https://uply.tv/dashboard/ai-team\n\nYour 5 AI employees are warming up right now.\n\nArian reads every reply to this email.\n\n— Arian, founder of UPLY\n\nUnsubscribe: ${unsubLink(email)}`;
        const html = wrap(`<div style="padding:32px 28px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:48px;margin-bottom:12px;">🚀</div>
            <h1 style="color:#ffffff;font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin:0 0 8px;">Welcome to UPLY, ${firstName}!</h1>
            <p style="color:#888;font-size:14px;margin:0;">Your AI team is warming up</p>
          </div>
          ${card(`<div>
            <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 16px;">Get started in 4 steps:</p>
            <p style="color:#CCCCCC;font-size:13px;margin:0 0 10px;">1️⃣ <a href="https://uply.tv/dashboard" style="color:#00FF85;">Create your space →</a></p>
            <p style="color:#CCCCCC;font-size:13px;margin:0 0 10px;">2️⃣ <a href="https://uply.tv/products" style="color:#00FF85;">Set your price →</a></p>
            <p style="color:#CCCCCC;font-size:13px;margin:0 0 10px;">3️⃣ <a href="https://uply.tv/go-live" style="color:#00FF85;">Go live →</a></p>
            <p style="color:#CCCCCC;font-size:13px;margin:0;">4️⃣ <a href="https://uply.tv/dashboard/ai-team" style="color:#00FF85;">Meet your AI team →</a></p>
          </div>`)}
          ${card(`<div style="border-left:3px solid #00FF85;padding-left:16px;">
            <p style="color:#CCCCCC;font-size:14px;font-style:italic;margin:0;">Arian reads every reply to this email. Tell me what you're building. — Arian</p>
          </div>`)}
          ${cta("Set Up Your Space →", "https://uply.tv/dashboard")}
        </div>`, email);
        await sendEmail(supabase, { to: email, subject_a: `Welcome to UPLY, ${firstName} 🚀`, subject_b: `${firstName}, your AI team is ready. Here's what to do first.`, preview_text: "5 AI employees are warming up right now. Create your space in the next 10 minutes.", html, text, template_name: "creator_welcome", metadata: meta });
        await supabase.from("profiles").update({ welcome_email_sent_at: new Date().toISOString() }).eq("user_id", user_id);
        break;
      }
      case "creator_day_3": {
        const text = `Hi ${firstName},\n\n3 days ago you signed up for UPLY. Your space still isn't live.\n\nCreators who set up in week 1 are 4x more likely to earn in 30 days.\n\nIt takes 5 minutes:\n1. Name your community\n2. Add a description\n3. Set a price (or start free)\n\nYour AI team is idle — they need a space to start working.\n\n→ https://uply.tv/dashboard\n\nUnsubscribe: ${unsubLink(email)}`;
        const html = wrap(`<div style="padding:32px 28px;">
          <h1 style="color:#ffffff;font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin:0 0 16px;">${firstName} — your space is waiting</h1>
          ${card(`<p style="color:#CCCCCC;font-size:14px;line-height:1.6;margin:0;">Creators who set up in week 1 are <strong style="color:#00FF85;">4x more likely</strong> to earn in 30 days. It takes 5 minutes.</p>`)}
          ${card(`<div>
            <p style="color:#CCCCCC;font-size:13px;margin:0 0 8px;">1️⃣ Name your community</p>
            <p style="color:#CCCCCC;font-size:13px;margin:0 0 8px;">2️⃣ Add a description</p>
            <p style="color:#CCCCCC;font-size:13px;margin:0;">3️⃣ Set a price (or start free)</p>
          </div>`)}
          <p style="color:#888;font-size:13px;margin:16px 0;">Your AI team is idle — they need a space to start working.</p>
          ${cta("Create Your Space →", "https://uply.tv/dashboard")}
        </div>`, email);
        await sendEmail(supabase, { to: email, subject_a: `${firstName} — your UPLY space is waiting`, subject_b: "3 days ago you signed up. Your space still isn't live.", preview_text: "Takes 5 minutes. Creators who set up in week 1 are 4x more likely to earn in 30 days.", html, text, template_name: "creator_day_3", metadata: meta });
        await supabase.from("profiles").update({ day3_email_sent_at: new Date().toISOString() }).eq("user_id", user_id);
        break;
      }
      case "creator_day_7": {
        const text = `Hi ${firstName},\n\nYour community is live — but you're not earning yet.\n\nThe #1 thing holding creators back: they never set a price.\n\nSet your first tier in 2 minutes:\n→ https://uply.tv/products\n\nUnsubscribe: ${unsubLink(email)}`;
        const html = wrap(`<div style="padding:32px 28px;">
          <h1 style="color:#ffffff;font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin:0 0 16px;">One step away from your first dollar 💰</h1>
          ${card(`<p style="color:#CCCCCC;font-size:14px;line-height:1.6;margin:0;">The #1 thing holding creators back: <strong style="color:#00FF85;">they never set a price.</strong></p>`)}
          ${cta("Set Your Price →", "https://uply.tv/products")}
        </div>`, email);
        await sendEmail(supabase, { to: email, subject_a: "You're one step away from your first dollar 💰", subject_b: `${firstName}, your community is live but you're not earning yet. Here's why.`, preview_text: `The #1 thing holding creators back: they never set a price.`, html, text, template_name: "creator_day_7", metadata: meta });
        await supabase.from("profiles").update({ day7_email_sent_at: new Date().toISOString() }).eq("user_id", user_id);
        break;
      }
      case "creator_day_14": {
        const text = `Hi ${firstName},\n\nTwo weeks in. Let's get you your first member.\n\nCreators who go live in week 1-2 get their first member 4x faster.\n\nYour AI team is ready to help.\n\n→ Go live: https://uply.tv/go-live\n→ Post an update: https://uply.tv/dashboard\n\nUnsubscribe: ${unsubLink(email)}`;
        const html = wrap(`<div style="padding:32px 28px;">
          <h1 style="color:#ffffff;font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin:0 0 16px;">Two weeks in — let's get you your first member 🎯</h1>
          ${card(`<p style="color:#CCCCCC;font-size:14px;line-height:1.6;margin:0;">Creators who go live in week 1-2 get their first member <strong style="color:#00FF85;">4x faster</strong>. Your AI team is ready.</p>`)}
          ${cta("Go Live Now →", "https://uply.tv/go-live")}
        </div>`, email);
        await sendEmail(supabase, { to: email, subject_a: "Two weeks in — let's get you your first member 🎯", subject_b: `${firstName}, your first member is closer than you think. Here's the fastest path.`, preview_text: "Creators who go live in week 1-2 get their first member 4x faster. Your AI team is ready.", html, text, template_name: "creator_day_14", metadata: meta });
        await supabase.from("profiles").update({ day14_email_sent_at: new Date().toISOString() }).eq("user_id", user_id);
        break;
      }
      case "first_live_stream": {
        if (profile.first_stream_email_sent_at) break;
        const text = `Hi ${firstName},\n\nYou just went live for the first time! 🔴\n\nYour AI team is already turning your stream into content:\n- Clips are being generated\n- Captions are being created\n- Your Content Studio will be ready in 10 minutes\n\n3 tips to turn viewers into members:\n1. Pin a join link during your next stream\n2. Offer an exclusive Q&A for members only\n3. Share clips on social → drive traffic back\n\n→ Content Studio: https://uply.tv/dashboard/content-studio\n\nUnsubscribe: ${unsubLink(email)}`;
        const html = wrap(`<div style="padding:32px 28px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:48px;margin-bottom:12px;">🔴</div>
            <h1 style="color:#ffffff;font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin:0 0 8px;">First stream done!</h1>
            <p style="color:#888;font-size:14px;margin:0;">Your AI team is already working on it</p>
          </div>
          ${card(`<div>
            <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 12px;">Your AI is generating:</p>
            <p style="color:#CCCCCC;font-size:13px;margin:0 0 6px;">✂️ Clips from key moments</p>
            <p style="color:#CCCCCC;font-size:13px;margin:0 0 6px;">📝 Captions and transcripts</p>
            <p style="color:#CCCCCC;font-size:13px;margin:0;">🎬 Ready in ~10 minutes</p>
          </div>`)}
          ${card(`<div>
            <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 12px;">3 tips to convert viewers:</p>
            <p style="color:#CCCCCC;font-size:13px;margin:0 0 6px;">1. Pin a join link during streams</p>
            <p style="color:#CCCCCC;font-size:13px;margin:0 0 6px;">2. Offer member-only Q&A</p>
            <p style="color:#CCCCCC;font-size:13px;margin:0;">3. Share clips on social media</p>
          </div>`)}
          ${cta("View Content Studio →", "https://uply.tv/dashboard/content-studio")}
        </div>`, email);
        await sendEmail(supabase, { to: email, subject_a: "🔴 You just went live for the first time — here's what's next", subject_b: `First stream done, ${firstName}. Your AI team is already turning it into content.`, preview_text: "Clips and captions are being generated right now. Your Content Studio will be ready in 10 minutes.", html, text, template_name: "first_live_stream", metadata: meta });
        await supabase.from("profiles").update({ first_stream_email_sent_at: new Date().toISOString() }).eq("user_id", user_id);
        break;
      }
      case "first_paying_member": {
        if (profile.first_payment_email_sent_at) break;
        const memberN = member_name || "Someone";
        const amt = amount || 0;
        const fee = platform_fee || Math.round(amt * 0.05 * 100) / 100;
        const earnings = amt - fee;
        const pct = amt > 0 ? Math.round((earnings / amt) * 100) : 95;
        const platformPct = 100 - pct;
        const refCode = profile.referral_code || "";

        const text = `${firstName}.\n\n${memberN} just paid you $${amt.toFixed(2)}.\n\nThis is your first dollar on UPLY.\nMost creators never make it here. You did.\n\nBREAKDOWN:\n$${amt.toFixed(2)} paid by ${memberN}\n$${earnings.toFixed(2)} went to you (${pct}%)\n$${fee.toFixed(2)} went to UPLY (${platformPct}%)\n\nWHAT TO DO RIGHT NOW:\n1. Screenshot this email and post it publicly\n2. Tell other creators about UPLY — your referral link: https://uply.tv/join/${refCode}\n3. Set up your next product or tier: https://uply.tv/products\n\nYour AI team already knows about this.\nThey're working on getting you your second member right now.\n\n— Arian, founder of UPLY\n\nUnsubscribe: ${unsubLink(email)}`;

        const html = wrap(`<div style="padding:32px 28px;">
          <div style="text-align:center;margin-bottom:24px;background:linear-gradient(135deg,#00FF85 0%,#00CC6A 100%);padding:32px;border-radius:12px;">
            <div style="font-size:48px;margin-bottom:12px;">💰</div>
            <h1 style="color:#000;font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:800;margin:0;">YOUR FIRST DOLLAR</h1>
          </div>
          ${card(`<table width="100%" cellpadding="6" cellspacing="0">
            <tr><td style="color:#888;font-size:12px;">Paid by</td><td style="color:#ffffff;font-size:16px;font-weight:600;text-align:right;">${memberN}</td></tr>
            <tr><td style="color:#888;font-size:12px;">Amount</td><td style="color:#00FF85;font-size:20px;font-weight:800;text-align:right;">$${amt.toFixed(2)}</td></tr>
            <tr><td style="color:#888;font-size:12px;">You earned (${pct}%)</td><td style="color:#ffffff;font-size:16px;text-align:right;">$${earnings.toFixed(2)}</td></tr>
            <tr><td style="color:#888;font-size:12px;">UPLY (${platformPct}%)</td><td style="color:#888;font-size:14px;text-align:right;">$${fee.toFixed(2)}</td></tr>
          </table>`)}
          ${card(`<div>
            <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 12px;">What to do right now:</p>
            <p style="color:#CCCCCC;font-size:13px;margin:0 0 8px;">📸 Screenshot this and share it</p>
            <p style="color:#CCCCCC;font-size:13px;margin:0 0 8px;">🔗 Share your link: <a href="https://uply.tv/join/${refCode}" style="color:#00FF85;">uply.tv/join/${refCode}</a></p>
            <p style="color:#CCCCCC;font-size:13px;margin:0;">🛒 <a href="https://uply.tv/products" style="color:#00FF85;">Set up your next product →</a></p>
          </div>`)}
          ${card(`<div style="border-left:3px solid #00FF85;padding-left:16px;">
            <p style="color:#CCCCCC;font-size:14px;font-style:italic;margin:0;">Your AI team already knows. They're working on getting you your second member. — Arian</p>
          </div>`)}
        </div>`, email);

        await sendEmail(supabase, { to: email, subject_a: `💰 YOUR FIRST DOLLAR ON UPLY — screenshot this`, subject_b: `${memberN} just paid you $${amt.toFixed(2)}. This is real, ${firstName}.`, preview_text: "Most creators never make it here. You did. Here's what to do in the next 10 minutes.", html, text, template_name: "first_paying_member", metadata: { ...meta, amount: amt, member_name: memberN } });
        await supabase.from("profiles").update({ first_payment_email_sent_at: new Date().toISOString() }).eq("user_id", user_id);
        break;
      }
      case "revenue_milestone": {
        const ms = milestone_amount || 0;
        const lastMs = profile.last_revenue_milestone_amount || 0;
        if (ms <= lastMs) break;
        const ytEquiv = Math.round(ms * 0.55);
        const twEquiv = Math.round(ms * 0.50);
        const saved = ms - ytEquiv;

        const subjects: Record<number, [string, string]> = {
          100: ["You just hit $100 on UPLY 🌱", `${firstName}, $100 earned. This is just the start.`],
          500: ["$500 earned on UPLY 📈", `${firstName}, $500. You're building something real.`],
          1000: ["$1,000 on UPLY. This is just the beginning. 🚀", `Four figures, ${firstName}. UPLY is working.`],
          5000: ["$5,000 earned — UPLY is working for you 💪", `${firstName}, $5k. You're in the top 10% of creators on UPLY.`],
          10000: ["$10,000 on UPLY. You're a professional creator now. 👑", `Five figures, ${firstName}. Most creators dream about this.`],
          50000: ["$50,000 on UPLY — you're in rare company 🏆", `${firstName}, $50k. You're one of UPLY's top earning creators.`],
          100000: ["$100,000. You built a real business on UPLY. 🎯", `Six figures, ${firstName}. From day one to $100k.`],
        };
        const [sa, sb] = subjects[ms] || [`$${ms.toLocaleString()} earned on UPLY 🎉`, `${firstName}, $${ms.toLocaleString()} on UPLY. Keep going.`];

        const text = `Hi ${firstName},\n\n$${ms.toLocaleString()} earned on UPLY.\n\nOn YouTube you would have earned roughly $${ytEquiv.toLocaleString()}.\nOn Twitch roughly $${twEquiv.toLocaleString()}.\nYou kept the difference: $${saved.toLocaleString()}.\n\nNote: competitor percentages are approximate industry averages, not exact guarantees.\n\nKeep going.\n\n→ Dashboard: https://uply.tv/dashboard\n\nUnsubscribe: ${unsubLink(email)}`;
        const html = wrap(`<div style="padding:32px 28px;">
          <div style="text-align:center;margin-bottom:24px;">
            <p style="color:#00FF85;font-size:56px;font-weight:800;margin:0;font-family:'Space Grotesk',sans-serif;">$${ms.toLocaleString()}</p>
            <p style="color:#888;font-size:14px;margin:8px 0 0;">earned on UPLY</p>
          </div>
          ${card(`<table width="100%" cellpadding="8" cellspacing="0">
            <tr><td style="color:#888;font-size:12px;">Platform</td><td style="color:#888;font-size:12px;text-align:right;">You'd Keep*</td></tr>
            <tr><td style="color:#00FF85;font-weight:700;">UPLY</td><td style="text-align:right;color:#00FF85;font-weight:700;">$${ms.toLocaleString()}</td></tr>
            <tr><td style="color:#CCCCCC;">YouTube</td><td style="text-align:right;color:#CCCCCC;">~$${ytEquiv.toLocaleString()}</td></tr>
            <tr><td style="color:#CCCCCC;">Twitch</td><td style="text-align:right;color:#CCCCCC;">~$${twEquiv.toLocaleString()}</td></tr>
          </table>
          <p style="color:#555;font-size:11px;margin:12px 0 0;">*Approximate averages — not exact guarantees</p>`)}
          ${cta("View Dashboard →", "https://uply.tv/dashboard")}
        </div>`, email);
        await sendEmail(supabase, { to: email, subject_a: sa, subject_b: sb, preview_text: `On YouTube you would have earned roughly $${ytEquiv.toLocaleString()}. On Twitch roughly $${twEquiv.toLocaleString()}. You kept the difference.`, html, text, template_name: `revenue_milestone_${ms}`, metadata: { ...meta, milestone: ms } });
        await supabase.from("profiles").update({ last_revenue_milestone_amount: ms }).eq("user_id", user_id);
        break;
      }
      case "creator_reengagement": {
        if (profile.last_reengagement_email_sent_at && new Date(profile.last_reengagement_email_sent_at) > new Date(Date.now() - 14 * 86400000)) break;
        const { count: memberCount } = await supabase.from("community_members").select("*", { count: "exact", head: true }).eq("creator_id", user_id);
        const daysSince = Math.round((Date.now() - new Date(profile.updated_at || profile.created_at).getTime()) / 86400000);

        const text = `Hi ${firstName},\n\nIt's been ${daysSince} days. Your ${memberCount || 0} members are still waiting.\n\nYour AI team kept things running while you were away.\n\n→ Go Live: https://uply.tv/go-live\n→ Post Update: https://uply.tv/dashboard\n\nUnsubscribe: ${unsubLink(email)}`;
        const html = wrap(`<div style="padding:32px 28px;">
          <h1 style="color:#ffffff;font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin:0 0 16px;">${firstName}, your community misses you</h1>
          ${card(`<div style="text-align:center;">
            <p style="color:#00FF85;font-size:36px;font-weight:800;margin:0;">${memberCount || 0}</p>
            <p style="color:#888;font-size:13px;margin:4px 0 0;">members waiting for you</p>
            <p style="color:#888;font-size:13px;margin:4px 0 0;">${daysSince} days since last activity</p>
          </div>`)}
          <div style="display:flex;gap:12px;justify-content:center;margin:24px 0;">
            ${cta("Go Live →", "https://uply.tv/go-live")}
          </div>
        </div>`, email);
        await sendEmail(supabase, { to: email, subject_a: `${firstName}, your community misses you`, subject_b: `${memberCount || 0} members are still waiting for you, ${firstName}.`, preview_text: `It's been ${daysSince} days. Your AI team kept things running. Here's what you missed.`, html, text, template_name: "creator_reengagement", metadata: { ...meta, days_since: daysSince } });
        await supabase.from("profiles").update({ last_reengagement_email_sent_at: new Date().toISOString() }).eq("user_id", user_id);
        break;
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("send-creator-lifecycle-emails error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}));
