// Derive a starter tier label + community-type recommendation from onboarding answers.
// Pure & UI-only — no DB calls.

export interface DerivedTier {
  level: 1 | 2 | 3 | 4;
  name: string;
  blurb: string;
  emoji: string;
}

export interface DerivedCommunityType {
  key: string;
  label: string;
  emoji: string;
  reason: string;
}

const FOLLOWER_BUCKET: Record<string, number> = {
  "Under 1K": 0,
  "1K–10K": 1,
  "10K–50K": 2,
  "50K–100K": 3,
  "100K–500K": 4,
  "500K+": 5,
};

const EARNINGS_BUCKET: Record<string, number> = {
  "$0–$500": 0,
  "$500–$2K": 1,
  "$2K–$10K": 2,
  "$10K–$50K": 3,
  "$50K+": 4,
};

export function deriveTier(opts: {
  followerCount?: string;
  isMonetizing?: string | null;
  monthlyEarnings?: string;
  creatorStage?: string;
}): DerivedTier {
  const f = FOLLOWER_BUCKET[opts.followerCount ?? ""] ?? 0;
  const e = opts.isMonetizing === "yes" ? EARNINGS_BUCKET[opts.monthlyEarnings ?? ""] ?? 0 : 0;
  const stageBoost =
    opts.creatorStage === "scaling" ? 2 : opts.creatorStage === "earning" ? 1 : 0;

  const score = f + e + stageBoost;
  let level: 1 | 2 | 3 | 4 = 1;
  if (score >= 8) level = 4;
  else if (score >= 5) level = 3;
  else if (score >= 2) level = 2;

  const map: Record<1 | 2 | 3 | 4, DerivedTier> = {
    1: { level: 1, name: "Starter", emoji: "🌱", blurb: "Lay the foundation: launch one product and post daily." },
    2: { level: 2, name: "Rising", emoji: "🚀", blurb: "Build momentum: weekly lives + a paid offer for warm fans." },
    3: { level: 3, name: "Scaling", emoji: "📈", blurb: "Stack revenue: tiered community + repurposing engine." },
    4: { level: 4, name: "Elite", emoji: "👑", blurb: "Optimize for leverage: high-ticket offer + paid ads." },
  };
  return map[level];
}

export function deriveCommunityType(opts: {
  firstUseCase?: string;
  goals?: string[];
  creatorType?: string;
}): DerivedCommunityType {
  const uc = (opts.firstUseCase ?? "").toLowerCase();
  const goals = (opts.goals ?? []).map((g) => g.toLowerCase());
  const ct = (opts.creatorType ?? "").toLowerCase();

  if (uc.includes("course") || goals.includes("launch_product") && ct.includes("educat")) {
    return {
      key: "course",
      label: "Course-led community",
      emoji: "📚",
      reason: "You're shipping knowledge — pair lessons with a focused community for higher completion + retention.",
    };
  }
  if (uc.includes("event") || uc.includes("live") || ct.includes("music") || ct.includes("gam")) {
    return {
      key: "live",
      label: "Live-first community",
      emoji: "🎙️",
      reason: "Your audience shows up for moments — weekly lives + ticketed events drive the most revenue.",
    };
  }
  if (uc.includes("paid community") || goals.includes("build_community")) {
    return {
      key: "membership",
      label: "Paid membership community",
      emoji: "🤝",
      reason: "Recurring access is your unlock — start a monthly tier with weekly value drops.",
    };
  }
  if (uc.includes("tip")) {
    return {
      key: "tipping",
      label: "Tipping & support community",
      emoji: "💸",
      reason: "Free community + tipping during lives is the lowest-friction revenue path for your stage.",
    };
  }
  return {
    key: "starter",
    label: "Starter community",
    emoji: "✨",
    reason: "We'll start you on a flexible community you can evolve as you learn what your audience pays for.",
  };
}

export interface PlanAction {
  week: 1 | 2 | 3 | 4;
  title: string;
  detail: string;
}

export function buildFirst30Days(opts: {
  tier: DerivedTier;
  community: DerivedCommunityType;
  goalTimeline?: string;
}): PlanAction[] {
  const base: PlanAction[] = [
    { week: 1, title: "Set up your space & first paid offer", detail: "Use the First Dollar Wizard (~5 min) to publish a community, course, or coaching offer." },
    { week: 1, title: "Post 1 short clip per day for 7 days", detail: "Repurpose existing content or record 30s tips. Consistency primes the discovery algorithm." },
    { week: 2, title: "Go live for the first time", detail: "30–45 min weekly live. Live converts 5–10× better than VOD — pin a Buy CTA." },
    { week: 2, title: "DM 10 warm fans about your offer", detail: "Direct asks beat broadcast posts at this stage. Aim for your first 5 paying members." },
    { week: 3, title: "Send your first newsletter", detail: "5-min update to everyone who joined. Builds the most reliable channel you own." },
    { week: 3, title: "Clip your best live into 3 shorts", detail: "One live = a week of content. Schedule the clips across the week." },
    { week: 4, title: "Run a retention check-in", detail: "1:1 message to your first members. Capture testimonials + churn signals before they leave." },
    { week: 4, title: "Review the dashboard & set your next 30-day goal", detail: "Look at members, MRR, and health score. Pick the one lever to push next month." },
  ];

  // Light personalization: nudge the tier-4 path toward higher leverage moves
  if (opts.tier.level >= 3) {
    base[1] = { week: 1, title: "Launch a higher-tier $497+ offer", detail: "Top 1% of fans fund your next phase — open a premium tier alongside the entry offer." };
    base[6] = { week: 4, title: "Run a $200 paid ad test", detail: "Scale only what's already converting organically. Measure CAC vs. first-month revenue." };
  }

  return base;
}
