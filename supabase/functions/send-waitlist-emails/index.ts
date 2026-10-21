import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { requireInternal, withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = () => Deno.env.get("RESEND_API_KEY")!;
const supabaseClient = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// ── helpers ──────────────────────────────────────────────────────────────────

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  to: string;
  subject_a: string;
  subject_b: string;
  preview_text: string;
  html: string;
  text: string;
  template_name: string;
  metadata?: any;
}) {
  // Check suppression
  const { data: suppressed } = await supabase.rpc("is_email_suppressed", { p_email: opts.to });
  if (suppressed) {
    await logEmail(supabase, { template_name: opts.template_name, recipient_email: opts.to, status: "suppressed", metadata: opts.metadata });
    return;
  }

  const ab_variant = Math.floor(Math.random() * 2) === 0 ? "a" : "b";
  const subject = ab_variant === "a" ? opts.subject_a : opts.subject_b;

  // Inject preview text
  const previewHtml = `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${opts.preview_text}</div>` + opts.html;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "UPLY <noreply@notify.uply.tv>",
        to: [opts.to],
        subject,
        html: previewHtml,
        text: opts.text,
      }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.message || JSON.stringify(result));
    await logEmail(supabase, {
      template_name: opts.template_name,
      recipient_email: opts.to,
      status: "sent",
      metadata: { ...opts.metadata, ab_variant, subject, message_id: result.id },
    });
  } catch (error: any) {
    await logEmail(supabase, {
      template_name: opts.template_name,
      recipient_email: opts.to,
      status: "failed",
      error_message: error.message,
      metadata: { ...opts.metadata, ab_variant },
    });
  }
}

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

function progressBar(current: number, max: number) {
  const pct = Math.min(100, Math.round((current / max) * 100));
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  return "█".repeat(filled) + "░".repeat(empty) + ` ${pct}%`;
}

// ── event handlers ───────────────────────────────────────────────────────────

async function handleWaitlistConfirmation(supabase: any, wl: any, totalCount: number) {
  if (wl.welcome_email_sent_at) return;
  const firstName = (wl.full_name || "Creator").split(" ")[0];
  const topPct = totalCount > 0 ? Math.max(1, Math.round((wl.position / totalCount) * 100)) : 100;
  const refLink = `https://uply.tv/join/${wl.referral_code}`;

  const text = `Hi ${firstName},\n\nYou're #${wl.position} on the UPLY waitlist.\nOut of ${totalCount.toLocaleString()} creators who have applied, you're in the top ${topPct}%.\n\nYOUR INVITE LINK\n${refLink}\n\nEvery creator you refer moves you up 10 spots.\n\nPRIZES FOR REFERRING:\n🥉 3 referrals → Jump 30 spots + Early Access unlocked\n🥈 10 referrals → Top 100 guaranteed + Founding Creator badge\n🥇 25 referrals → Founding Rate Lock (your 95% payout locked for life)\n\nWHAT YOU'RE GETTING EARLY ACCESS TO:\n- Go Live — streaming with instant monetization\n- Community — paid memberships and exclusive content\n- Courses — sell knowledge, build passive income\n- AI Team — 5 AI employees running your business 24/7\n- Keep 95% — vs 55% on YouTube and 50% on Twitch\n\nYou applied to the UPLY waitlist.\nUnsubscribe: ${unsubLink(wl.email)}`;

  const html = wrap(`<div style="padding:32px 28px;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:#ffffff;font-family:'Space Grotesk',-apple-system,sans-serif;font-size:20px;font-weight:700;margin:0 0 8px;">Welcome to the waitlist, ${firstName}!</h1>
      <p style="color:#888888;font-size:14px;margin:0;">You're officially in line for early access</p>
    </div>
    ${card(`<div style="text-align:center;">
      <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">YOUR WAITLIST POSITION</p>
      <p style="color:#00FF85;font-size:72px;font-weight:800;margin:0;font-family:'Space Grotesk',sans-serif;">#${wl.position}</p>
      <p style="color:#888;font-size:13px;margin:8px 0 0;">out of ${totalCount.toLocaleString()} creators · Top ${topPct}%</p>
    </div>`)}
    ${card(`<div style="border:1px solid #00FF85;border-radius:8px;padding:16px;text-align:center;">
      <p style="color:#888;font-size:11px;margin:0 0 8px;">YOUR INVITE LINK</p>
      <p style="color:#00FF85;font-size:14px;font-weight:600;margin:0;word-break:break-all;">${refLink}</p>
    </div>`)}
    <div style="margin:20px 0;">
      <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 12px;">🏆 Prizes for referring:</p>
      <p style="color:#CD7F32;font-size:13px;margin:0 0 6px;">🥉 3 referrals → Jump 30 spots + Early Access</p>
      <p style="color:#C0C0C0;font-size:13px;margin:0 0 6px;">🥈 10 referrals → Top 100 + Founding Creator badge</p>
      <p style="color:#FFD700;font-size:13px;margin:0 0 6px;">🥇 25 referrals → Founding Rate Lock (95% payout for life)</p>
    </div>
    <div style="margin:20px 0;">
      <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 12px;">What you're getting:</p>
      <p style="color:#CCCCCC;font-size:13px;margin:0 0 4px;">🔴 Go Live — streaming with instant monetization</p>
      <p style="color:#CCCCCC;font-size:13px;margin:0 0 4px;">👥 Community — paid memberships</p>
      <p style="color:#CCCCCC;font-size:13px;margin:0 0 4px;">📚 Courses — sell knowledge</p>
      <p style="color:#CCCCCC;font-size:13px;margin:0 0 4px;">🤖 AI Team — 5 AI employees 24/7</p>
      <p style="color:#CCCCCC;font-size:13px;margin:0 0 4px;">💰 Keep 95% of revenue</p>
    </div>
    ${cta("Share Your Invite Link →", refLink)}
  </div>`, wl.email);

  await sendEmail(supabase, {
    to: wl.email,
    subject_a: `You're #${wl.position} on the UPLY waitlist 🎯`,
    subject_b: `${firstName}, your UPLY spot is confirmed — here's your invite link`,
    preview_text: `Move up 10 spots for every creator you refer. Your referral link is inside.`,
    html, text,
    template_name: "waitlist_confirmation_v2",
    metadata: { waitlist_id: wl.id, position: wl.position },
  });

  await supabase.from("waitlist").update({ welcome_email_sent_at: new Date().toISOString() }).eq("id", wl.id);
}

async function handleReferrerNotified(supabase: any, wl: any, applicantName: string, applicantCreatorType: string) {
  if ((wl.referrer_notification_email_sent_count || 0) >= 50) return;
  const firstName = (wl.full_name || "Creator").split(" ")[0];
  const refLink = `https://uply.tv/join/${wl.referral_code}`;
  const nextMilestone = wl.referral_count < 3 ? 3 : wl.referral_count < 10 ? 10 : 25;
  const spotsToNext = Math.max(0, nextMilestone - wl.referral_count);
  const nextName = nextMilestone === 3 ? "Early Access" : nextMilestone === 10 ? "Founding Creator" : "Founding Rate Lock";

  const text = `Hi ${firstName},\n\n${applicantName} (${applicantCreatorType || "Creator"}) just used your UPLY invite link!\n\nYour referral count: ${wl.referral_count}\nLeaderboard rank: #${wl.leaderboard_rank || "—"}\n${spotsToNext > 0 ? `${spotsToNext} more referrals to unlock ${nextName}` : "You've unlocked all milestones!"}\n\nShare your link: ${refLink}\n\nUnsubscribe: ${unsubLink(wl.email)}`;

  const html = wrap(`<div style="padding:32px 28px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:12px;">🎉</div>
      <h1 style="color:#ffffff;font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin:0 0 8px;">${applicantName.split(" ")[0]} just joined!</h1>
      <p style="color:#888;font-size:14px;margin:0;">${applicantCreatorType || "Creator"} · Used your invite link</p>
    </div>
    ${card(`<div style="text-align:center;">
      <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px;">YOUR STATS</p>
      <p style="color:#00FF85;font-size:40px;font-weight:800;margin:0;">${wl.referral_count}</p>
      <p style="color:#888;font-size:13px;margin:8px 0 0;">referrals · Rank #${wl.leaderboard_rank || "—"}</p>
      ${spotsToNext > 0 ? `<p style="color:#CCCCCC;font-size:13px;margin:8px 0 0;">${spotsToNext} more → ${nextName}</p>` : `<p style="color:#FFD700;font-size:13px;margin:8px 0 0;">👑 All milestones unlocked!</p>`}
    </div>`)}
    ${cta("Share Again →", refLink)}
  </div>`, wl.email);

  await sendEmail(supabase, {
    to: wl.email,
    subject_a: `🎉 ${applicantName.split(" ")[0]} just used your UPLY invite link!`,
    subject_b: `Your referral count is now ${wl.referral_count} — you moved up the waitlist`,
    preview_text: `You're now rank #${wl.leaderboard_rank || "—"} on the UPLY leaderboard. ${spotsToNext} more to unlock ${nextName}.`,
    html, text,
    template_name: "referrer_notified_v2",
    metadata: { waitlist_id: wl.id, referral_count: wl.referral_count },
  });

  await supabase.from("waitlist").update({
    referrer_notification_email_sent_count: (wl.referrer_notification_email_sent_count || 0) + 1,
  }).eq("id", wl.id);
}

async function handleMilestone3(supabase: any, wl: any) {
  if (wl.milestone_3_email_sent_at) return;
  const firstName = (wl.full_name || "Creator").split(" ")[0];
  const refLink = `https://uply.tv/join/${wl.referral_code}`;
  const bar = progressBar(3, 10);

  const text = `Hi ${firstName},\n\nYou did it. 3 referrals.\n\nYou've unlocked Early Access to UPLY. We're activating your account within 24 hours.\n\nYour new position: #${wl.position}\nYour leaderboard rank: #${wl.leaderboard_rank || "—"}\n\nWHAT'S NEXT:\n7 more referrals unlocks your Founding Creator badge and guarantees a top 100 spot.\n\nProgress: 3 of 10 referrals [${bar}]\n\nYour invite link: ${refLink}\n\nUnsubscribe: ${unsubLink(wl.email)}`;

  const html = wrap(`<div style="padding:32px 28px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:12px;">✅</div>
      <h1 style="color:#ffffff;font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin:0 0 8px;">Early Access Unlocked!</h1>
      <p style="color:#888;font-size:14px;margin:0;">3 referrals — your account is being activated</p>
    </div>
    ${card(`<div style="text-align:center;">
      <p style="color:#00FF85;font-size:32px;font-weight:800;margin:0;">#${wl.position}</p>
      <p style="color:#888;font-size:13px;margin:4px 0 0;">Your position · Rank #${wl.leaderboard_rank || "—"}</p>
    </div>`)}
    ${card(`<div>
      <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 8px;">Next: Founding Creator Badge</p>
      <p style="color:#888;font-size:13px;margin:0 0 8px;">7 more referrals to go</p>
      <p style="color:#00FF85;font-family:monospace;font-size:14px;margin:0;">3/10 [${bar}]</p>
    </div>`)}
    ${cta("Keep Going — Share Your Link →", refLink)}
  </div>`, wl.email);

  await sendEmail(supabase, {
    to: wl.email,
    subject_a: "🎉 3 referrals — you just unlocked Early Access to UPLY",
    subject_b: `${firstName}, you earned it — your UPLY early access is on the way`,
    preview_text: `You referred 3 creators. Early access is being activated. 7 more to reach the leaderboard top 100.`,
    html, text,
    template_name: "referral_milestone_3",
    metadata: { waitlist_id: wl.id },
  });

  await supabase.from("waitlist").update({ milestone_3_email_sent_at: new Date().toISOString() }).eq("id", wl.id);
}

async function handleMilestone10(supabase: any, wl: any) {
  if (wl.milestone_10_email_sent_at) return;
  const firstName = (wl.full_name || "Creator").split(" ")[0];
  const refLink = `https://uply.tv/join/${wl.referral_code}`;
  const bar = progressBar(10, 25);

  const text = `Hi ${firstName},\n\n10 referrals. You're officially a UPLY Founding Creator candidate.\n\nYour leaderboard rank: #${wl.leaderboard_rank || "—"}\nFounding Creator badge: UNLOCKED\nTop 100: GUARANTEED\n\nThe Founding Rate Lock locks in your 95% payout for life.\n15 more referrals to unlock it.\n\nProgress: 10 of 25 referrals [${bar}]\n\nShare: ${refLink}\n\nUnsubscribe: ${unsubLink(wl.email)}`;

  const html = wrap(`<div style="padding:32px 28px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:12px;">🏆</div>
      <h1 style="color:#FFD700;font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin:0 0 8px;">Founding Creator Badge Unlocked</h1>
      <p style="color:#888;font-size:14px;margin:0;">Top 100 guaranteed — you're rank #${wl.leaderboard_rank || "—"}</p>
    </div>
    ${card(`<div style="text-align:center;">
      <p style="color:#FFD700;font-size:48px;font-weight:800;margin:0;">#${wl.leaderboard_rank || "—"}</p>
      <p style="color:#888;font-size:13px;margin:8px 0 0;">Leaderboard Rank</p>
    </div>`)}
    ${card(`<div>
      <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 8px;">Next: Founding Rate Lock — 95% payout for life</p>
      <p style="color:#888;font-size:13px;margin:0 0 4px;">Your 95% creator payout, guaranteed for life</p>
      <p style="color:#888;font-size:13px;margin:0 0 8px;">15 more referrals to go</p>
      <p style="color:#00FF85;font-family:monospace;font-size:14px;margin:0;">10/25 [${bar}]</p>
    </div>`)}
    ${cta("Claim Your Founding Creator Badge →", "https://uply.tv/auth")}
  </div>`, wl.email);

  await sendEmail(supabase, {
    to: wl.email,
    subject_a: "🏆 Top 100 locked in — you're a UPLY founding pioneer",
    subject_b: `${firstName}, you're rank #${wl.leaderboard_rank || "—"} — Founding Creator badge unlocked`,
    preview_text: `You're in the top 100. Your Founding Creator badge is permanent. 15 more referrals = Founding Rate Lock (95% for life).`,
    html, text,
    template_name: "referral_milestone_10",
    metadata: { waitlist_id: wl.id },
  });

  await supabase.from("waitlist").update({ milestone_10_email_sent_at: new Date().toISOString() }).eq("id", wl.id);
}

async function handleMilestone25(supabase: any, wl: any) {
  if (wl.milestone_25_email_sent_at) return;
  const firstName = (wl.full_name || "Creator").split(" ")[0];

  const text = `Hi ${firstName},\n\n25 referrals. You are officially a UPLY Founding Creator.\n\nYOUR FOUNDING RATE LOCK:\nYour 95% creator payout is locked in for life. No rate hikes, ever.\n\nTHE MATH:\nIf you earn $10,000/month on UPLY:\n- UPLY: you keep $9,500 (locked 95% payout, for life)\n- YouTube: you'd keep roughly $5,500 (they take up to 45%)\n- Twitch: you'd keep $5,000 (they take up to 50%)\n\nYour name will be permanently listed as one of UPLY's founding creators.\nYour profile will be featured in the UPLY launch announcement.\nYou get priority creator support — always.\n\nA note from Arian (founder):\nYou believed in this before anyone else. That means everything. — Arian\n\nClaim your status: https://uply.tv/auth\n\nUnsubscribe: ${unsubLink(wl.email)}`;

  const html = wrap(`<div style="padding:32px 28px;">
    <div style="text-align:center;margin-bottom:24px;background:linear-gradient(135deg,#00FF85 0%,#00CC6A 100%);padding:32px;border-radius:12px;">
      <div style="font-size:48px;margin-bottom:12px;">👑</div>
      <h1 style="color:#000;font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:800;margin:0 0 8px;">Founding Rate Lock — 95% for Life</h1>
      <p style="color:#000;font-size:14px;font-weight:600;margin:0;">You are a UPLY Founding Creator</p>
    </div>
    ${card(`<table width="100%" cellpadding="8" cellspacing="0" style="color:#CCCCCC;font-size:14px;">
      <tr style="border-bottom:1px solid #1E1E1E;">
        <td style="color:#888;font-size:12px;">Platform</td>
        <td style="color:#888;font-size:12px;text-align:right;">You Keep</td>
        <td style="color:#888;font-size:12px;text-align:right;">They Take</td>
      </tr>
      <tr><td style="color:#00FF85;font-weight:700;">UPLY</td><td style="text-align:right;color:#00FF85;font-weight:700;">$9,500</td><td style="text-align:right;color:#00FF85;">5% (locked)</td></tr>
      <tr><td>YouTube</td><td style="text-align:right;">~$5,500</td><td style="text-align:right;color:#888;">~45%</td></tr>
      <tr><td>Twitch</td><td style="text-align:right;">~$5,000</td><td style="text-align:right;color:#888;">~50%</td></tr>
    </table>
    <p style="color:#00FF85;font-size:16px;font-weight:700;text-align:center;margin:16px 0 0;">Your 95% payout — locked for life.</p>`)}
    ${card(`<div style="border-left:3px solid #00FF85;padding-left:16px;">
      <p style="color:#888;font-size:12px;margin:0 0 8px;">A NOTE FROM ARIAN (FOUNDER)</p>
      <p style="color:#CCCCCC;font-size:14px;font-style:italic;line-height:1.6;margin:0;">You believed in this before anyone else. That means everything. — Arian</p>
    </div>`)}
    ${cta("Claim Your Founding Creator Status →", "https://uply.tv/auth")}
  </div>`, wl.email);

  await sendEmail(supabase, {
    to: wl.email,
    subject_a: "👑 You're a Founding Creator — 95% payout locked for life",
    subject_b: `${firstName}, 25 referrals. You built something. Your 95% payout is locked for life.`,
    preview_text: `The Founding Rate Lock: your 95% creator payout, guaranteed for life. No rate hikes, ever.`,
    html, text,
    template_name: "referral_milestone_25",
    metadata: { waitlist_id: wl.id },
  });

  await supabase.from("waitlist").update({ milestone_25_email_sent_at: new Date().toISOString() }).eq("id", wl.id);
}

async function handleRankMovement(supabase: any, wl: any) {
  const improvement = (wl.previous_leaderboard_rank || 0) - (wl.leaderboard_rank || 0);
  if (improvement < 5) return;
  const firstName = (wl.full_name || "Creator").split(" ")[0];
  const refLink = `https://uply.tv/join/${wl.referral_code}`;
  const nextMilestone = wl.referral_count < 3 ? 3 : wl.referral_count < 10 ? 10 : 25;
  const spotsToNext = Math.max(0, nextMilestone - wl.referral_count);
  const nextName = nextMilestone === 3 ? "Early Access" : nextMilestone === 10 ? "Founding Creator" : "Founding Rate Lock";

  const text = `Hi ${firstName},\n\nYou jumped ${improvement} spots on the UPLY leaderboard!\n\nOld rank: #${wl.previous_leaderboard_rank}\nNew rank: #${wl.leaderboard_rank}\n\n${spotsToNext > 0 ? `${spotsToNext} more referrals to ${nextName}` : "All milestones unlocked!"}\n\nShare your link: ${refLink}\n\nUnsubscribe: ${unsubLink(wl.email)}`;

  const html = wrap(`<div style="padding:32px 28px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:12px;">📈</div>
      <h1 style="color:#ffffff;font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;margin:0;">You jumped ${improvement} spots!</h1>
    </div>
    ${card(`<div style="text-align:center;">
      <span style="color:#888;font-size:24px;font-weight:700;">#${wl.previous_leaderboard_rank}</span>
      <span style="color:#00FF85;font-size:24px;margin:0 12px;">→</span>
      <span style="color:#00FF85;font-size:36px;font-weight:800;">#${wl.leaderboard_rank}</span>
    </div>`)}
    ${spotsToNext > 0 ? card(`<p style="color:#CCCCCC;font-size:14px;margin:0;">${spotsToNext} more referrals to <strong style="color:#00FF85;">${nextName}</strong></p>`) : ""}
    ${cta("Share Your Link →", refLink)}
  </div>`, wl.email);

  await sendEmail(supabase, {
    to: wl.email,
    subject_a: `📈 You jumped ${improvement} spots on the UPLY leaderboard`,
    subject_b: `You're now rank #${wl.leaderboard_rank} — ${improvement} spots closer to Founding Creator`,
    preview_text: `${wl.referral_count} creators used your link recently. ${spotsToNext} more to ${nextName}.`,
    html, text,
    template_name: "rank_movement",
    metadata: { waitlist_id: wl.id, improvement },
  });
}

async function handleEarlyAccessGranted(supabase: any, wl: any) {
  if (wl.early_access_email_sent_at) return;
  const firstName = (wl.full_name || "Creator").split(" ")[0];
  const refLink = `https://uply.tv/join/${wl.referral_code}`;

  const text = `Hi ${firstName},\n\nYou're in. UPLY early access is yours.\n\nHere's how to get started:\n1. Create your account: https://uply.tv/auth\n2. Set up your space: https://uply.tv/dashboard\n3. Go live or upload your first video\n\nYour AI team is already waiting for you.\n\nKeep sharing your link: ${refLink}\n\nQuestions or feedback? Email feedback@uply.tv\n\n— Arian, founder of UPLY\n\nUnsubscribe: ${unsubLink(wl.email)}`;

  const html = wrap(`<div style="padding:32px 28px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:12px;">🔓</div>
      <h1 style="color:#00FF85;font-family:'Space Grotesk',sans-serif;font-size:24px;font-weight:700;margin:0 0 8px;">You're In</h1>
      <p style="color:#888;font-size:14px;margin:0;">UPLY early access is yours</p>
    </div>
    ${card(`<div>
      <p style="color:#ffffff;font-size:14px;font-weight:600;margin:0 0 16px;">Get started in 3 steps:</p>
      <p style="color:#CCCCCC;font-size:13px;margin:0 0 8px;">1️⃣ <a href="https://uply.tv/auth" style="color:#00FF85;text-decoration:none;">Create your account →</a></p>
      <p style="color:#CCCCCC;font-size:13px;margin:0 0 8px;">2️⃣ <a href="https://uply.tv/dashboard" style="color:#00FF85;text-decoration:none;">Set up your space →</a></p>
      <p style="color:#CCCCCC;font-size:13px;margin:0;">3️⃣ Go live or upload your first video</p>
    </div>`)}
    ${card(`<div style="border-left:3px solid #00FF85;padding-left:16px;">
      <p style="color:#CCCCCC;font-size:14px;font-style:italic;line-height:1.6;margin:0;">Questions? Reply to feedback@uply.tv — I read every message. — Arian</p>
    </div>`)}
    ${cta("Get Started →", "https://uply.tv/auth")}
  </div>`, wl.email);

  await sendEmail(supabase, {
    to: wl.email,
    subject_a: "🔓 You're in — UPLY early access is yours",
    subject_b: `${firstName}, your UPLY account is ready. Here's how to get started.`,
    preview_text: "Create your space, set your price, go live. Your AI team is already waiting for you.",
    html, text,
    template_name: "early_access_granted",
    metadata: { waitlist_id: wl.id },
  });

  await supabase.from("waitlist").update({ early_access_email_sent_at: new Date().toISOString() }).eq("id", wl.id);
}

// ── main handler ─────────────────────────────────────────────────────────────

Deno.serve(withCors(async (req) => {
  // SECURITY: cron / internal only (x-cron-secret or service-role bearer).
  if (req.method !== 'OPTIONS') {
    const denied = requireInternal(req);
    if (denied) return denied;
  }
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { event_type, waitlist_id, applicant_name, applicant_creator_type } = await req.json();
    const supabase = supabaseClient();

    const { data: wl, error } = await supabase.from("waitlist").select("*").eq("id", waitlist_id).single();
    if (error || !wl) {
      return new Response(JSON.stringify({ error: "Waitlist entry not found" }), { status: 404, headers: corsHeaders });
    }

    const { count: totalCount } = await supabase.from("waitlist").select("*", { count: "exact", head: true });

    switch (event_type) {
      case "waitlist_confirmation":
        await handleWaitlistConfirmation(supabase, wl, totalCount || 0);
        break;
      case "referrer_notified":
        await handleReferrerNotified(supabase, wl, applicant_name || "Someone", applicant_creator_type || "Creator");
        break;
      case "referral_milestone_3":
        await handleMilestone3(supabase, wl);
        break;
      case "referral_milestone_10":
        await handleMilestone10(supabase, wl);
        break;
      case "referral_milestone_25":
        await handleMilestone25(supabase, wl);
        break;
      case "rank_movement":
        await handleRankMovement(supabase, wl);
        break;
      case "early_access_granted":
        await handleEarlyAccessGranted(supabase, wl);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown event_type: ${event_type}` }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("send-waitlist-emails error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}));
