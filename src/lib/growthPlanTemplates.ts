import type { EditablePlan } from "@/hooks/useGrowthPlan";

export interface GrowthPlanTemplate {
  id: string;
  name: string;
  emoji: string;
  audience: string;
  blurb: string;
  build: (creatorName: string) => Omit<EditablePlan, "id">;
}

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const GROWTH_PLAN_TEMPLATES: GrowthPlanTemplate[] = [
  {
    id: "coach",
    name: "Coach / Consultant",
    emoji: "🎯",
    audience: "1:1 coaches, advisors, mentors",
    blurb: "Book discovery calls, prove transformation, raise rates.",
    build: (name) => ({
      title: `${name}'s Coaching Launch — 30 days`,
      durationDays: 30,
      targetKpis: { members: 25, mrr: 2000, tier: 2 },
      weeklyTasks: [
        { id: uid(), title: "Post 3 client win stories", description: "Short-form video or carousel proving transformation.", recurDays: 7, hour: 9 },
        { id: uid(), title: "Host 1 live Q&A", description: "Free 30-min session in your community to drive trust.", recurDays: 7, hour: 18 },
        { id: uid(), title: "Send 10 personal DMs", description: "Warm outreach to engaged followers — invite to discovery call.", recurDays: 1, hour: 11 },
      ],
      milestones: [
        { id: uid(), title: "Publish coaching offer page", description: "Pricing, outcomes, FAQ, booking link.", date: inDays(7), hour: 12 },
        { id: uid(), title: "Book 5 discovery calls", description: "From DMs, lives, and content CTAs.", date: inDays(14), hour: 12 },
        { id: uid(), title: "Close $2k in 1:1 packages", description: "Convert 2-3 discovery calls into paid clients.", date: inDays(30), hour: 12 },
      ],
      nextActions: [
        { title: "Pin a free 'audit' offer to your bio", reason: "Lowest-friction CTA → fills your pipeline fast." },
        { title: "Record a 5-min loom of your method", reason: "Send to every cold lead instead of repeating yourself." },
        { title: "Raise rates 20% after 3 closes", reason: "Demand validates pricing — don't leave money on the table." },
      ],
    }),
  },
  {
    id: "course",
    name: "Course Creator",
    emoji: "🎓",
    audience: "Educators selling cohort or evergreen courses",
    blurb: "Validate, pre-sell, then launch.",
    build: (name) => ({
      title: `${name}'s Course Launch Sprint`,
      durationDays: 30,
      targetKpis: { members: 100, mrr: 5000, tier: 2 },
      weeklyTasks: [
        { id: uid(), title: "Publish 1 deep tutorial", description: "Long-form video or post that teaches the core skill.", recurDays: 7, hour: 10 },
        { id: uid(), title: "Email your list with a lesson + CTA", description: "Build the waitlist habit — short, useful, ends with a link.", recurDays: 7, hour: 8 },
        { id: uid(), title: "Reply to every comment within 24h", description: "Engagement compounds — surface stories from real students.", recurDays: 1, hour: 19 },
      ],
      milestones: [
        { id: uid(), title: "Open a free waitlist", description: "Capture emails with curriculum preview + early-bird price.", date: inDays(5), hour: 10 },
        { id: uid(), title: "Run a free live workshop", description: "1-hour session that teaches & pitches the course.", date: inDays(20), hour: 18 },
        { id: uid(), title: "Open cart & hit $5k in pre-sales", description: "Limited 5-day window with bonuses for early buyers.", date: inDays(28), hour: 9 },
      ],
      nextActions: [
        { title: "Outline the course before recording anything", reason: "Sell the outcome, then build to it — avoid 6-month rabbit holes." },
        { title: "Pre-sell with a Beta cohort at 50% off", reason: "Validates demand and gets testimonials for the real launch." },
        { title: "Add 1 testimonial per week", reason: "Social proof is the #1 lever for cold traffic conversion." },
      ],
    }),
  },
  {
    id: "community",
    name: "Community Builder",
    emoji: "👥",
    audience: "Paid memberships, mastermind, niche communities",
    blurb: "Activate members, drive retention, ladder pricing.",
    build: (name) => ({
      title: `${name}'s Community Flywheel`,
      durationDays: 30,
      targetKpis: { members: 200, mrr: 3000, tier: 2 },
      weeklyTasks: [
        { id: uid(), title: "Host 1 live event for members", description: "AMA, hot-seat, or guest expert — drives stickiness.", recurDays: 7, hour: 18 },
        { id: uid(), title: "Welcome every new member by name", description: "DM + tag in welcome thread within 24h of joining.", recurDays: 1, hour: 10 },
        { id: uid(), title: "Spotlight 1 member win publicly", description: "Repost on your channels — turns members into evangelists.", recurDays: 7, hour: 14 },
      ],
      milestones: [
        { id: uid(), title: "Define your weekly community ritual", description: "Same time, same format — Monday kick-off, Friday wins, etc.", date: inDays(7), hour: 9 },
        { id: uid(), title: "Reach 50% 30-day active members", description: "Track posters/commenters vs. lurkers — improve onboarding.", date: inDays(21), hour: 12 },
        { id: uid(), title: "Launch a premium tier", description: "Higher-priced inner circle for top 10% of members.", date: inDays(30), hour: 10 },
      ],
      nextActions: [
        { title: "Write a one-line community promise", reason: "Members need to know what they get every week — clarity drives retention." },
        { title: "Run a 30-day onboarding sequence", reason: "First 30 days predict lifetime value. Hand-hold or lose them." },
        { title: "Survey churned members monthly", reason: "Their honest feedback unlocks the next $1k MRR." },
      ],
    }),
  },
  {
    id: "creator",
    name: "Content Creator",
    emoji: "🎥",
    audience: "Streamers, YouTubers, podcasters monetizing audience",
    blurb: "Grow audience, diversify revenue beyond ads.",
    build: (name) => ({
      title: `${name}'s Audience-to-Revenue Plan`,
      durationDays: 30,
      targetKpis: { members: 500, mrr: 1500, tier: 1 },
      weeklyTasks: [
        { id: uid(), title: "Ship 3 short-form videos", description: "Hook in 2s, payoff in 30. Clip from longform when possible.", recurDays: 7, hour: 11 },
        { id: uid(), title: "Go live 1x for 60+ minutes", description: "Real-time engagement compounds reach across platforms.", recurDays: 7, hour: 19 },
        { id: uid(), title: "Send a weekly newsletter", description: "Owned audience > rented. Recap, exclusive insight, single CTA.", recurDays: 7, hour: 8 },
      ],
      milestones: [
        { id: uid(), title: "Launch 1 paid product (digital download or merch)", description: "Lowest-effort first revenue beyond ads.", date: inDays(10), hour: 12 },
        { id: uid(), title: "Hit 1k newsletter subscribers", description: "Pin signup in every video, bio, and live overlay.", date: inDays(21), hour: 9 },
        { id: uid(), title: "Land first brand deal", description: "Pitch 5 brands with audience data and rate card.", date: inDays(30), hour: 14 },
      ],
      nextActions: [
        { title: "Pick 1 platform as the home base", reason: "Multi-platform is leverage; trying to win all of them at once is suicide." },
        { title: "Repurpose every long video into 5+ clips", reason: "10x distribution from work you already did." },
        { title: "Add a 'support me' tier on day one", reason: "Even 10 supporters teaches you how to talk about money." },
      ],
    }),
  },
  {
    id: "saas",
    name: "Indie / SaaS",
    emoji: "🚀",
    audience: "Indie hackers, micro-SaaS, product-led founders",
    blurb: "Build in public, validate, get to first paying customers.",
    build: (name) => ({
      title: `${name}'s Build-in-Public Launch`,
      durationDays: 30,
      targetKpis: { members: 50, mrr: 1000, tier: 1 },
      weeklyTasks: [
        { id: uid(), title: "Ship 1 user-visible feature", description: "Tweet a before/after demo. Velocity is the moat.", recurDays: 7, hour: 12 },
        { id: uid(), title: "Talk to 3 users live", description: "Zoom or Loom — pain → workflow → would they pay.", recurDays: 7, hour: 15 },
        { id: uid(), title: "Post 1 build-in-public update", description: "Revenue, lessons, screenshots. Audience compounds.", recurDays: 7, hour: 9 },
      ],
      milestones: [
        { id: uid(), title: "Publish landing page + waitlist", description: "Hero, pain, demo gif, email capture. Ship before perfect.", date: inDays(5), hour: 10 },
        { id: uid(), title: "Onboard 10 design partners free", description: "Trade access for feedback + testimonials.", date: inDays(14), hour: 12 },
        { id: uid(), title: "Charge first $1k MRR", description: "Move 5+ design partners to paid plans with founder pricing.", date: inDays(30), hour: 10 },
      ],
      nextActions: [
        { title: "Write a 1-page positioning doc", reason: "Who, pain, alternative, why now. If you can't, neither can your customer." },
        { title: "Set up Stripe before you 'need' it", reason: "Removes friction the moment someone says yes." },
        { title: "Track signups → activation → paid weekly", reason: "Find the leaky bucket before scaling traffic." },
      ],
    }),
  },
];
