// UPLY vs X , SEO comparison page configs.
// All copy here is original UPLY copy. Competitor facts are conservative,
// public-knowledge statements (pricing model, category focus) phrased
// factually "as of 2026". Competitor names appear in plain text only
// (nominative use) , no logos, no disparagement.

export type ComparisonCell = string | boolean;

export interface FeatureRow {
  feature: string;
  uply: ComparisonCell;
  them: ComparisonCell;
}

export interface PricingColumn {
  heading: string;
  points: string[];
}

export interface FaqEntry {
  q: string;
  a: string;
}

export interface ComparisonConfig {
  slug: string;
  competitorName: string;
  /** Short category tagline shown as the hero eyebrow. */
  tagline: string;
  /** 2–3 sentence hero summary , also used as the meta description. */
  heroSummary: string;
  featureTable: FeatureRow[];
  pricing: {
    them: PricingColumn;
    uply: PricingColumn;
    note: string;
  };
  chooseThem: string[];
  chooseUply: string[];
  faqs: FaqEntry[];
  /** One-line bottom-line takeaway rendered as a highlighted band above the FAQ. */
  verdict?: string;
}

/** Shared UPLY pricing column , single source of truth across all pages. */
const UPLY_PRICING: PricingColumn = {
  heading: "UPLY creator plans",
  points: [
    "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
    "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
    "14-day free trial (card required) · cancel anytime",
    "Fans and members join free , they only ever pay for what they buy from you",
  ],
};

const PRICING_NOTE =
  "Competitor pricing summarized from publicly available information as of 2026 and may change , always confirm current pricing on the competitor's own site.";

export const COMPARISONS: ComparisonConfig[] = [
  // ── Ticketmaster ────────────────────────────────────────────────────────
  {
    slug: "ticketmaster",
    competitorName: "Ticketmaster",
    tagline: "Enterprise event ticketing",
    heroSummary:
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
    featureTable: [
      { feature: "Sell tickets online", uply: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.", them: true },
      { feature: "Built for", uply: "Independent creators & event hosts", them: "Major venues, promoters & arena tours" },
      { feature: "Fee on ticket sales", uply: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.", them: "Service & processing fees vary per ticket (as of 2026)" },
      { feature: "QR door check-in", uply: "Built in , staff scanners & live occupancy", them: true },
      { feature: "Ticket resale marketplace", uply: "Built in for every event you run", them: "Official resale on select events" },
      { feature: "Livestream the event (pay-per-view)", uply: "Built in , sell a second, virtual ticket", them: false },
      { feature: "Fan community & memberships", uply: "Built in , keep fans between shows", them: false },
      { feature: "Courses & digital products", uply: true, them: false },
      { feature: "Email blasts & SmartLinks", uply: "Built in , fill the next event yourself", them: false },
      { feature: "AI team (ARIA , 5 agents)", uply: "Event copilot, pricing & fraud agents included", them: false },
    ],
    pricing: {
      them: {
        heading: "Ticketmaster , per-ticket fees",
        points: [
          "Free for organizers to list; buyers pay service and processing fees per ticket",
          "Fees vary by event, venue, and agreement , as of 2026",
          "Built around large venues and tour-scale inventory , unmatched for arenas",
        ],
      },
      uply: UPLY_PRICING,
      note: PRICING_NOTE,
    },
    chooseThem: [
      "You're a major venue or promoter who needs arena-scale ticketing distribution",
      "Your events are already routed through venues with existing Ticketmaster agreements",
      "You want the reach of the biggest consumer ticketing marketplace",
    ],
    chooseUply: [
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      "You want tickets, resale, QR check-in, and a PPV livestream in one login",
      "You want to own the attendee relationship , emails, memberships, and the next show",
      "You want AI working every event , copilot, pricing intelligence, and fraud watch",
      "You're building an events business under your own brand, not a listing on someone else's",
    ],
    faqs: [
      {
        q: "Can UPLY handle door scanning like a big ticketing platform?",
        a: "Yes. Every UPLY ticket carries a QR code, the built-in scanner app checks attendees in at the door, and you can add staff scanners per event and watch occupancy in real time , no extra hardware contracts, no per-scan fees.",
      },
      {
        q: "Does UPLY have a resale marketplace?",
        a: "Yes , a resale marketplace is built in for your events, so fans can safely resell tickets they can't use while you keep control of the experience (and the fan data) instead of losing both to third-party resellers.",
      },
      {
        q: "How much does UPLY cost per ticket compared to typical ticketing fees?",
        a: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      },
    ],
    verdict:
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
  },

  // ── HubSpot ─────────────────────────────────────────────────────────────
  {
    slug: "hubspot",
    competitorName: "HubSpot",
    tagline: "B2B CRM & marketing automation",
    heroSummary:
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
    featureTable: [
      { feature: "Built for", uply: "Creators & creator businesses", them: "B2B sales & marketing teams" },
      { feature: "Contact / audience management", uply: "Members, fans & subscribers , tied to real revenue", them: "Full-featured CRM" },
      { feature: "Email marketing", uply: "Blasts + SmartLinks with analytics , included", them: "Advanced automation & sequences" },
      { feature: "Sell subscriptions & memberships", uply: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.", them: "Via integrations" },
      { feature: "Live streaming + tips + PPV", uply: "Built in , monetized from day one", them: false },
      { feature: "Courses & community", uply: true, them: false },
      { feature: "Event ticketing + QR check-in", uply: true, them: false },
      { feature: "Music releases & live shopping", uply: true, them: false },
      { feature: "AI assistance", uply: "ARIA , a 5-agent AI team working your business", them: "AI features across its hubs" },
      { feature: "White-label branding", uply: "Studio plan", them: false },
    ],
    pricing: {
      them: {
        heading: "HubSpot , tiered hubs & seats",
        points: [
          "Free CRM tier; paid hubs priced per seat and tier, as of 2026",
          "Costs scale with contacts, seats, and which hubs you add",
          "Enterprise tiers for larger teams",
        ],
      },
      uply: UPLY_PRICING,
      note: PRICING_NOTE,
    },
    chooseThem: [
      "You run a B2B sales team that needs pipelines, deal stages, and rep reporting",
      "You need deep marketing automation with complex branching sequences",
      "Your business is lead-gen and account-based, not audience monetization",
    ],
    chooseUply: [
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      "One login replaces a CRM, an email tool, a link page, a course host, and a ticketing platform",
      "You want AI that promotes your work , clips, posts, emails , not just scores your leads",
      "You want pricing that stays flat while your audience grows , no per-contact math",
      "You want everything under your brand, all the way to white-label on Studio",
    ],
    faqs: [
      {
        q: "Is UPLY a CRM replacement?",
        a: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      },
      {
        q: "Can UPLY send marketing emails like an automation suite?",
        a: "UPLY includes email blasts with analytics, sent from a dedicated sending domain , built for what creators actually send: drops, events, and streams. You skip the automation-suite learning curve and the per-contact pricing that usually comes with it.",
      },
      {
        q: "Can I use UPLY and a CRM together?",
        a: "Yes. If you have a genuine sales motion, keep a CRM for business development and run the audience side , content, community, ticketing, and payments , on UPLY. For most creators, UPLY alone covers the whole job.",
      },
    ],
    verdict:
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
  },

  // ── Whop ────────────────────────────────────────────────────────────────
  {
    slug: "whop",
    competitorName: "Whop",
    tagline: "Digital product marketplace",
    heroSummary:
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
    featureTable: [
      { feature: "Sell digital products & paid communities", uply: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.", them: true },
      { feature: "Discovery", uply: "Creator discovery feed + Roku TV channel", them: "Marketplace discovery" },
      { feature: "Fee on sales", uply: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.", them: "Percentage fee per sale (varies, as of 2026)" },
      { feature: "Live streaming + tips + PPV", uply: "Built in , go live and get paid", them: false },
      { feature: "Courses / classroom", uply: "Full course builder wired into community", them: "Course apps available" },
      { feature: "Event ticketing + QR check-in + resale", uply: true, them: false },
      { feature: "Music releases", uply: true, them: false },
      { feature: "Live shopping", uply: true, them: false },
      { feature: "Email blasts & SmartLinks", uply: "Built in , your list, reachable anytime", them: "Limited" },
      { feature: "AI team (ARIA , 5 agents)", uply: true, them: "AI and business tools available" },
      { feature: "White-label branding", uply: "Studio plan", them: false },
    ],
    pricing: {
      them: {
        heading: "Whop , pay per sale",
        points: [
          "Free to start selling; takes a percentage fee on each sale, as of 2026",
          "Fee structure varies by product type and checkout flow",
          "Marketplace listing included",
        ],
      },
      uply: UPLY_PRICING,
      note: PRICING_NOTE,
    },
    chooseThem: [
      "You sell purely digital goods and want a marketplace to route buyers to you",
      "You monetize an existing chat community and want lightweight tooling around it",
      "You want zero monthly cost and are fine paying per sale",
    ],
    chooseUply: [
      "Your business is bigger than downloads , streams, events, music, live shopping",
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      "You want your storefront under your own brand, not inside a marketplace's",
      "You want your fans on your list , email them directly, no marketplace in between",
      "You want ARIA repurposing every stream into clips, posts, and emails",
    ],
    faqs: [
      {
        q: "Does UPLY support paid communities like a digital-product marketplace does?",
        a: "Yes , and more around them. UPLY includes community spaces with gated content, memberships, and a full course builder, then adds live streaming, ticketing, and music releases on top, so your community becomes one part of a bigger business you own.",
      },
      {
        q: "How do fees compare?",
        a: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      },
      {
        q: "Can fans find me on UPLY without me driving all the traffic?",
        a: "Yes , UPLY has a creator discovery feed and a Roku TV channel for founding creators, so fans can find you inside the platform. And because the list is yours, every fan you convert stays reachable by email , no algorithm in between.",
      },
    ],
    verdict:
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
  },

  // ── Skool ───────────────────────────────────────────────────────────────
  {
    slug: "skool",
    competitorName: "Skool",
    tagline: "Community & courses",
    heroSummary:
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
    featureTable: [
      { feature: "Community spaces & feed", uply: "Built in , gated content & memberships", them: "Gamified communities (levels, leaderboards)" },
      { feature: "Courses / classroom", uply: "Full course builder , included", them: true },
      { feature: "Live streaming with tips & PPV", uply: "Built in , get paid while you're live", them: false },
      { feature: "Event ticketing + QR check-in", uply: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.", them: false },
      { feature: "Ticket resale marketplace", uply: true, them: false },
      { feature: "Music releases & live shopping", uply: true, them: false },
      { feature: "Email tools", uply: "Email blasts + SmartLinks with analytics", them: "Community email digests" },
      { feature: "AI team (ARIA , 5 agents)", uply: true, them: false },
      { feature: "AI content repurposing", uply: "Every video becomes clips, posts & emails", them: false },
      { feature: "Sub-accounts & white-label", uply: "Studio plan", them: false },
      { feature: "Fee on sales", uply: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.", them: "Monthly price per group + transaction fee (as of 2026)" },
    ],
    pricing: {
      them: {
        heading: "Skool , per-group monthly price",
        points: [
          "One flat monthly price per community, as of 2026",
          "A transaction fee applies to payments you collect through the platform",
          "Simple, single-product pricing",
        ],
      },
      uply: UPLY_PRICING,
      note: PRICING_NOTE,
    },
    chooseThem: [
      "You want the simplest possible paid community with gamification and nothing else",
      "Your entire business is one community and one course",
      "You value a minimal toolset over an all-in-one platform",
    ],
    chooseUply: [
      "You run events, streams, or drops alongside your community , one roof, one login",
      "Your members can buy more than access , tickets, courses, PPV streams, music",
      "You want real email blasts and SmartLinks with analytics, not just digests",
      "You want ARIA turning your content into clips, posts, and emails automatically",
      "You want sub-accounts and white-label ready when you scale (Studio)",
    ],
    faqs: [
      {
        q: "Does UPLY have communities and courses like a community platform?",
        a: "Yes , UPLY includes community spaces with feeds and gated content plus a full course builder. The difference is everything around them: live streaming, ticketing, music, email, and AI are native, so your community grows into a business without a single integration.",
      },
      {
        q: "I only need a community today. Is UPLY overkill?",
        a: "If one community is truly all you'll ever run, a single-purpose tool may be cheaper. But most creators grow , an event here, a stream there, a paid drop , and re-platforming members later is painful. On UPLY they never move; the 14-day trial is a cheap way to find out.",
      },
      {
        q: "Can I migrate an existing community to UPLY?",
        a: "Yes , invite your members with a link; their accounts are free. You rebuild course content in the UPLY classroom builder, and from day one your community sits next to ticketing, streaming, and email instead of on an island.",
      },
    ],
    verdict:
      "If one gamified community is your whole business, Skool does that job well. The moment you add events, streams, or drops, UPLY is the platform you'd otherwise be duct-taping together.",
  },

  // ── Fiverr ──────────────────────────────────────────────────────────────
  {
    slug: "fiverr",
    competitorName: "Fiverr",
    tagline: "Freelance services marketplace",
    heroSummary:
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
    featureTable: [
      { feature: "Core model", uply: "Sell to an audience you own", them: "Marketplace gigs for buyers" },
      { feature: "Who owns the customer relationship", uply: "You , your list, your members, your repeat buyers", them: "The marketplace connects you per order" },
      { feature: "Take rate", uply: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.", them: "Commission per order (historically around 20%, as of 2026)" },
      { feature: "Recurring memberships & subscriptions", uply: "Built in , predictable monthly revenue", them: "Subscriptions on select services" },
      { feature: "Live streaming + tips + PPV", uply: true, them: false },
      { feature: "Courses & community", uply: true, them: false },
      { feature: "Events + ticketing + QR check-in", uply: true, them: false },
      { feature: "Artist booking", uply: "Message & book artists for shows", them: "Hire freelancers for digital services" },
      { feature: "Email blasts & SmartLinks", uply: true, them: false },
      { feature: "AI tools", uply: "ARIA AI team (5 agents) + repurposing", them: "AI tools for briefs & matching" },
    ],
    pricing: {
      them: {
        heading: "Fiverr , commission per order",
        points: [
          "Free to list services; the platform takes a commission on each order , historically around 20% for sellers, as of 2026",
          "At that rate, $1,000 in orders returns roughly $800 to the seller , confirm current rates",
          "Buyers also pay service fees at checkout · no monthly subscription required to sell",
        ],
      },
      uply: UPLY_PRICING,
      note: PRICING_NOTE,
    },
    chooseThem: [
      "You're starting from zero audience and want a marketplace to bring you buyers",
      "You sell one-off digital services (design, editing, dev) to strangers",
      "You'd rather pay per order than a monthly platform fee",
    ],
    chooseUply: [
      "You own the customer , your list, your members, your repeat buyers",
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      "You monetize five ways from one login , memberships, tickets, courses, streams, music",
      "You set prices for your audience instead of competing per gig",
      "ARIA promotes you , repurposing content and drafting the emails that sell the next drop",
    ],
    faqs: [
      {
        q: "Is UPLY a freelance marketplace?",
        a: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      },
      {
        q: "Can I sell services on UPLY?",
        a: "You sell what your audience buys , memberships, courses, event tickets, PPV streams, music, and products via live shopping. UPLY also includes artist booking, so venues and hosts can message and book performers directly, on your terms.",
      },
      {
        q: "Which is cheaper for a working creator?",
        a: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      },
    ],
    verdict:
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
  },

  // ── Kajabi ──────────────────────────────────────────────────────────────
  {
    slug: "kajabi",
    competitorName: "Kajabi",
    tagline: "Knowledge-business platform",
    heroSummary:
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
    featureTable: [
      { feature: "Courses & coaching products", uply: "Full classroom, wired into community & payments", them: true },
      { feature: "Community", uply: true, them: true },
      { feature: "Email marketing", uply: "Email blasts + SmartLinks with analytics", them: "Email campaigns & funnels" },
      { feature: "Websites & funnels", uply: "Creator profile, storefront & SmartLinks", them: "Funnel & website builder" },
      { feature: "Live streaming + tips + PPV", uply: "Built in , teach live, get tipped live", them: false },
      { feature: "Event ticketing + QR check-in + resale", uply: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.", them: false },
      { feature: "Music releases & live shopping", uply: true, them: false },
      { feature: "AI", uply: "ARIA AI team (5 agents) + content repurposing", them: "AI creator tools" },
      { feature: "Transaction fee", uply: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.", them: "Third-party-provider fees vary by plan" },
      { feature: "White-label & Roku TV channel", uply: "Studio plan", them: false },
    ],
    pricing: {
      them: {
        heading: "Kajabi , tiered monthly plans",
        points: [
          "Tiered monthly plans for knowledge businesses, as of 2026",
          "Third-party-provider fees vary by plan; see official pricing",
          "Limits on products/contacts vary by tier",
        ],
      },
      uply: UPLY_PRICING,
      note: PRICING_NOTE,
    },
    chooseThem: [
      "Your business is purely courses, coaching, and funnels",
      "You want a mature funnel/website builder as the center of your stack",
      "Zero transaction fees on plans matters more to you than platform breadth",
    ],
    chooseUply: [
      "You're a performer, streamer, or event host as well as an educator",
      "One flat fee covers what would otherwise be several subscriptions , courses, streaming, ticketing, email",
      "You want tickets and PPV streams sold to the same audience that buys your courses",
      "You want ARIA turning every lesson and stream into clips, posts, and emails",
      "You want a white-label path and a Roku TV channel as you scale (Studio)",
    ],
    faqs: [
      {
        q: "Is UPLY's course builder comparable to a dedicated course platform?",
        a: "UPLY's classroom covers structured courses with lessons, modules, and gated access, wired straight into your community and payments. Dedicated course platforms go deeper on funnels and automation; UPLY goes wider across your whole creator business , and for most creators, wide is what compounds.",
      },
      {
        q: "How do UPLY creator plan fees work?",
        a: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      },
      {
        q: "Can I move my course content to UPLY?",
        a: "Yes , you rebuild your curriculum in UPLY's classroom builder (lessons, modules, gating) and invite students with free member accounts. There's no import fee, and the 14-day trial is enough time to test the move before you commit.",
      },
    ],
    verdict:
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
  },

  // ── Patreon ─────────────────────────────────────────────────────────────
  {
    slug: "patreon",
    competitorName: "Patreon",
    tagline: "Membership & patronage",
    heroSummary:
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
    featureTable: [
      { feature: "Fan memberships & subscriptions", uply: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.", them: true },
      { feature: "Platform take", uply: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.", them: "Percentage of earnings, varies by plan (as of 2026)" },
      { feature: "Live streaming + tips + PPV", uply: "Built in , full RTMP streaming with chat", them: "Limited" },
      { feature: "Courses / classroom", uply: true, them: false },
      { feature: "Events + ticketing + QR check-in", uply: true, them: false },
      { feature: "Music releases", uply: "Built in , releases your fans can buy", them: "Audio posts & podcast feeds" },
      { feature: "Community", uply: "Community spaces & feeds , a real home for members", them: "Community chat & comments" },
      { feature: "Email tools", uply: "Email blasts + SmartLinks with analytics", them: "Posts & messages to patrons" },
      { feature: "AI team (ARIA , 5 agents)", uply: true, them: false },
      { feature: "White-label & Roku TV channel", uply: "Studio plan", them: false },
    ],
    pricing: {
      them: {
        heading: "Patreon , percentage of earnings",
        points: [
          "Free to start; the platform takes a percentage of your monthly earnings, with the rate varying by plan and signup era, as of 2026",
          "Payment processing fees apply on top",
          "No monthly subscription cost for creators",
        ],
      },
      uply: UPLY_PRICING,
      note: PRICING_NOTE,
    },
    chooseThem: [
      "You want zero monthly cost and only pay when patrons pay you",
      "Your model is purely recurring patronage with simple perk tiers",
      "Your audience already expects to support you there",
    ],
    chooseUply: [
      "You want more ways to earn from the same fans , streams, tickets, courses, music",
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      "Your members get a real home , community spaces, gated content, a classroom",
      "You email your list directly, with SmartLink analytics showing what converts",
      "ARIA keeps the content flowing , clips, posts, and emails from every stream",
    ],
    faqs: [
      {
        q: "Can my supporters subscribe to me on UPLY like a membership platform?",
        a: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      },
      {
        q: "How is UPLY's fee different from a percentage-of-earnings model?",
        a: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      },
      {
        q: "Do my fans have to pay for UPLY?",
        a: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      },
    ],
    verdict:
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
  },

  // ── Twitch ──────────────────────────────────────────────────────────────
  {
    slug: "twitch",
    competitorName: "Twitch",
    tagline: "Live streaming & gaming",
    heroSummary:
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
    featureTable: [
      { feature: "Live streaming", uply: "RTMP ingest, HLS playback, stream chat , pro-grade", them: "Industry-standard live platform" },
      { feature: "Revenue share on subscriptions", uply: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.", them: "Revenue share (around 50/50 standard, as of 2026)" },
      { feature: "Tips during streams", uply: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.", them: "Bits & third-party tools" },
      { feature: "Pay-per-view streams", uply: "Built in , turn big moments into box office", them: false },
      { feature: "Built-in viewer discovery", uply: "Discovery feed + Roku TV channel", them: "Massive built-in viewer base , unmatched reach" },
      { feature: "Courses & community spaces", uply: "Built in , your community lives with your stream", them: "Chat; community typically lives off-platform" },
      { feature: "Events + ticketing + QR check-in", uply: true, them: false },
      { feature: "Music releases & live shopping", uply: true, them: false },
      { feature: "Email your audience directly", uply: "Built in , own the relationship, not just the follow", them: false },
      { feature: "AI team (ARIA , 5 agents)", uply: true, them: false },
      { feature: "Monthly cost to creators", uply: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.", them: "Free to stream" },
    ],
    pricing: {
      them: {
        heading: "Twitch , free to stream, revenue share",
        points: [
          "Free for creators to broadcast",
          "Monetization via subs, bits, and ads on a revenue-share basis , around 50/50 on standard subs for most streamers, with improved splits under certain programs, as of 2026",
          "On a 50/50 split, $1,000 in subs returns about $500 · payouts subject to eligibility thresholds",
        ],
      },
      uply: UPLY_PRICING,
      note: PRICING_NOTE,
    },
    chooseThem: [
      "You're brand new and need free tooling plus a giant pool of potential viewers",
      "Gaming-native culture, raids, and that ecosystem are core to your content",
      "You aren't ready to invest a monthly fee in your stream yet",
    ],
    chooseUply: [
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      "You own your audience , their emails and memberships, not just their follows",
      "You sell what a stream alone can't , ticketed events, courses, music, live shopping",
      "PPV streams turn your biggest moments into box-office nights",
      "ARIA clips and repurposes every broadcast while you sleep",
    ],
    faqs: [
      {
        q: "Is UPLY's streaming tech production-grade?",
        a: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      },
      {
        q: "Can I stream on UPLY and a free platform at the same time?",
        a: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      },
      {
        q: "Why pay a monthly fee when streaming elsewhere is free?",
        a: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      },
    ],
    verdict:
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
  },

  // ── Eventbrite ──────────────────────────────────────────────────────────
  {
    slug: "eventbrite",
    competitorName: "Eventbrite",
    tagline: "Self-service event ticketing",
    heroSummary:
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
    featureTable: [
      { feature: "Create & sell event tickets", uply: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.", them: true },
      { feature: "Fee on paid tickets", uply: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.", them: "Percentage + flat fee per paid ticket (as of 2026)" },
      { feature: "QR door check-in", uply: "Built in , staff roles & live occupancy", them: true },
      { feature: "Ticket resale marketplace", uply: "Built in , you keep control (and the data)", them: false },
      { feature: "Wristbands & multi-day passes", uply: "Built in , festival-ready", them: "Varies by plan" },
      { feature: "Livestream the event (pay-per-view)", uply: "Built in , sell a virtual ticket too", them: false },
      { feature: "Fan community & memberships", uply: "Built in , keep attendees between events", them: false },
      { feature: "Courses, music releases & live shopping", uply: true, them: false },
      { feature: "Email tools", uply: "Email blasts + SmartLinks with analytics", them: "Event email campaigns" },
      { feature: "AI team (ARIA , 5 agents)", uply: "Event copilot, pricing & fraud agents", them: false },
    ],
    pricing: {
      them: {
        heading: "Eventbrite , per-ticket fees",
        points: [
          "Paid tickets carry a service fee (a percentage plus a flat amount per ticket) and payment processing, as of 2026",
          "Fees can be passed to buyers or absorbed by the organizer",
          "Free events are typically free to list",
        ],
      },
      uply: UPLY_PRICING,
      note: PRICING_NOTE,
    },
    chooseThem: [
      "You run occasional events and want a household-name listing page",
      "You rely on that platform's event discovery in your city",
      "You only need ticketing , nothing before or after the event",
    ],
    chooseUply: [
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      "Resale, wristbands, multi-day passes, and PPV livestreams are all built in",
      "You keep the attendee relationship , email list, memberships, and the next show",
      "ARIA works the event with you , copilot, pricing intelligence, and fraud watch",
      "Your events live under your brand, next to your community and content",
    ],
    faqs: [
      {
        q: "Does UPLY handle check-in and door staff like a ticketing platform?",
        a: "Yes. UPLY tickets carry QR codes, the scanner works per event with staff roles, and organizers see live occupancy. Wristbands and multi-day validity are supported for festivals , all included, no add-on tier.",
      },
      {
        q: "How do UPLY's ticket fees compare?",
        a: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      },
      {
        q: "Can I livestream my event to fans who can't attend?",
        a: "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
      },
    ],
    verdict:
      "Free $0/month with 3% UPLY fee. Pro $99/month and Studio $249/month with 0% UPLY fee. Stripe processing extra. New rates pending activation.",
  },
];

/** Look up a comparison config by slug (case-insensitive). */
export function getComparison(slug: string | undefined): ComparisonConfig | undefined {
  if (!slug) return undefined;
  const s = slug.toLowerCase();
  return COMPARISONS.find((c) => c.slug === s);
}
