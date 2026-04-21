import type { CreatorProfile } from "@/context/AppContext";

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  /** Recurrence frequency in days (e.g. 1 = daily, 7 = weekly). Omit for one-time. */
  recurDays?: number;
  /** ISO date string (YYYY-MM-DD) for one-time milestones. */
  date?: string;
  /** Hour of day (0–23) to schedule the event. */
  hour?: number;
}

export interface GrowthPlan {
  generatedAt: string;
  creatorName: string;
  kpis: {
    members: number;
    mrr: number;
    tier: number;
    tierName: string;
    healthScore: number;
  };
  weeklyTasks: PlanTask[];
  milestones: PlanTask[];
  nextActions: { title: string; reason: string }[];
}

const CHALLENGE_ACTIONS: Record<string, { title: string; reason: string }[]> = {
  "first-members": [
    { title: "DM 10 people who'd love your community", reason: "Warm intros convert 10× better than cold posts." },
    { title: "Post a 60s 'who this is for' video", reason: "Clarity > reach. People join when they see themselves in your offer." },
    { title: "Offer a 7-day free trial to your first 25 sign-ups", reason: "Reduce risk to break the cold-start problem." },
  ],
  pricing: [
    { title: "Audit competitor pricing in your niche", reason: "Anchor against the top 3 — don't underprice your value." },
    { title: "Add an annual plan with 2 months free", reason: "Annual plans cut churn in half and front-load cash." },
    { title: "Test a $1 trial vs. 7-day free trial", reason: "Paid trials filter for serious buyers." },
  ],
  content: [
    { title: "Batch-record 5 short clips this week", reason: "Consistency beats virality. Show up daily." },
    { title: "Repurpose your best stream into 3 shorts", reason: "One live = a week of content if you clip it." },
    { title: "Write a 'pillar' post your audience can save", reason: "Saveable content = compound discovery." },
  ],
  converting: [
    { title: "Add a sticky 'Buy' CTA to your live streams", reason: "Live + scarcity converts 5–10× better than VOD." },
    { title: "Send a 3-email welcome sequence", reason: "First 72 hours decide if they pay or churn." },
    { title: "Pin a testimonial wall to your profile", reason: "Social proof closes hesitant buyers." },
  ],
  churn: [
    { title: "Run a 1:1 retention check-in with top 5 members", reason: "Hear churn signals before they leave." },
    { title: "Ship a member-only weekly live", reason: "Live access is the #1 retention lever." },
    { title: "Launch a 30-day onboarding sequence", reason: "Activated members stay 4× longer." },
  ],
  "scaling-ceiling": [
    { title: "Hire your first VA for 10 hrs/week", reason: "Buy your time back so you can focus on growth." },
    { title: "Launch a higher-tier $497+ offer", reason: "Top 1% of members fund the next phase." },
    { title: "Run a paid ad test ($200 budget)", reason: "Scale only what converts organically first." },
  ],
};

const DEFAULT_ACTIONS = [
  { title: "Launch one paid product this week", reason: "First dollar > perfection." },
  { title: "Go live once this week", reason: "Live is the fastest path to trust + conversions." },
  { title: "Post 1 short daily for 7 days", reason: "Discovery momentum compounds." },
];

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function buildGrowthPlan(profile: CreatorProfile): GrowthPlan {
  const challengeActions = profile.challenge ? CHALLENGE_ACTIONS[profile.challenge] : null;
  const nextActions = (challengeActions || DEFAULT_ACTIONS).slice(0, 3);

  const weeklyTasks: PlanTask[] = [
    {
      id: "weekly-live",
      title: "🎙️ Weekly live stream",
      description: "Go live for 30–45 min. Live converts 5–10× better than VOD. We'll auto-notify your followers.",
      recurDays: 7,
      hour: 19,
    },
    {
      id: "daily-short",
      title: "📱 Post 1 short clip",
      description: "Repurpose stream highlights or record a 30s tip. Consistency drives the discovery algorithm.",
      recurDays: 1,
      hour: 9,
    },
    {
      id: "weekly-newsletter",
      title: "✉️ Weekly newsletter to members",
      description: "Send a 5-min update. Your list is your most reliable channel.",
      recurDays: 7,
      hour: 10,
    },
  ];

  const milestones: PlanTask[] = [
    {
      id: "milestone-product",
      title: "🚀 Launch first monetized product",
      description: "Set up a paid community, course, or coaching offer. The First Dollar Wizard takes ~5 min.",
      date: todayPlus(7),
      hour: 10,
    },
    {
      id: "milestone-100-members",
      title: "🎯 Hit 100 paying members",
      description: "Target milestone — at $20 ARPU that's $2k MRR. Achievable in 30–60 days with daily posting + weekly lives.",
      date: todayPlus(60),
      hour: 12,
    },
    {
      id: "milestone-tier-up",
      title: `⭐ Reach ${profile.tier < 4 ? `Tier ${profile.tier + 1}` : "Elite"} status`,
      description: "Each tier unlocks new features, lower fees, and bigger payouts.",
      date: todayPlus(90),
      hour: 12,
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    creatorName: profile.name || "Creator",
    kpis: {
      members: profile.members,
      mrr: profile.mrr,
      tier: profile.tier,
      tierName: profile.tierName,
      healthScore: profile.healthScore,
    },
    weeklyTasks,
    milestones,
    nextActions,
  };
}

/* ================== ICS export ================== */

function pad(n: number): string { return n < 10 ? `0${n}` : `${n}`; }

function toIcsDate(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`
  );
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function makeEvent(opts: {
  uid: string;
  title: string;
  description: string;
  start: Date;
  durationMin: number;
  rrule?: string;
}): string {
  const end = new Date(opts.start.getTime() + opts.durationMin * 60_000);
  const lines = [
    "BEGIN:VEVENT",
    `UID:${opts.uid}@uply.tv`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(opts.start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(opts.title)}`,
    `DESCRIPTION:${escapeIcs(opts.description)}`,
  ];
  if (opts.rrule) lines.push(`RRULE:${opts.rrule}`);
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

/** Build an RFC 5545 .ics document for the plan. */
export function buildIcs(plan: GrowthPlan): string {
  const events: string[] = [];
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0);
  // Start tomorrow so we don't backfill
  baseDate.setDate(baseDate.getDate() + 1);

  for (const t of plan.weeklyTasks) {
    const start = new Date(baseDate);
    start.setHours(t.hour ?? 9, 0, 0, 0);
    if (t.recurDays === 1) {
      events.push(
        makeEvent({
          uid: `uply-${t.id}`,
          title: t.title,
          description: t.description,
          start,
          durationMin: 15,
          rrule: "FREQ=DAILY;COUNT=30",
        }),
      );
    } else if (t.recurDays === 7) {
      events.push(
        makeEvent({
          uid: `uply-${t.id}`,
          title: t.title,
          description: t.description,
          start,
          durationMin: 45,
          rrule: "FREQ=WEEKLY;COUNT=8",
        }),
      );
    }
  }

  for (const m of plan.milestones) {
    if (!m.date) continue;
    const [y, mo, d] = m.date.split("-").map(Number);
    const start = new Date(Date.UTC(y, mo - 1, d, m.hour ?? 12, 0, 0));
    events.push(
      makeEvent({
        uid: `uply-${m.id}`,
        title: m.title,
        description: m.description,
        start,
        durationMin: 60,
      }),
    );
  }

  const doc = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UPLY//Growth Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(plan.creatorName)}'s UPLY Growth Plan`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return doc;
}

/** Plain-text summary for sharing in email/Slack/etc. */
export function buildPlanText(plan: GrowthPlan): string {
  const fmt = (n: number) => n.toLocaleString();
  const lines: string[] = [];
  lines.push(`📈 ${plan.creatorName}'s UPLY Growth Plan`);
  lines.push("");
  lines.push("Current snapshot");
  lines.push(`• Members: ${fmt(plan.kpis.members)}`);
  lines.push(`• MRR: $${fmt(plan.kpis.mrr)}`);
  lines.push(`• Tier: ${plan.kpis.tier} — ${plan.kpis.tierName}`);
  lines.push(`• Health score: ${plan.kpis.healthScore}/100`);
  lines.push("");
  lines.push("Next 3 actions");
  plan.nextActions.forEach((a, i) => {
    lines.push(`${i + 1}. ${a.title}`);
    lines.push(`   → ${a.reason}`);
  });
  lines.push("");
  lines.push("Weekly cadence");
  plan.weeklyTasks.forEach((t) => {
    const cadence = t.recurDays === 1 ? "Daily" : t.recurDays === 7 ? "Weekly" : "Once";
    lines.push(`• ${t.title} (${cadence}) — ${t.description}`);
  });
  lines.push("");
  lines.push("Milestones");
  plan.milestones.forEach((m) => {
    lines.push(`• ${m.date} — ${m.title}`);
    lines.push(`   ${m.description}`);
  });
  lines.push("");
  lines.push("— Generated by UPLY · https://uply.tv");
  return lines.join("\n");
}

export function downloadIcs(plan: GrowthPlan) {
  const ics = buildIcs(plan);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `uply-growth-plan-${plan.creatorName.replace(/\s+/g, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
