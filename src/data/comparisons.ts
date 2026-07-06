// UPLY vs X — SEO comparison page configs.
// All copy here is original UPLY copy. Competitor facts are conservative,
// public-knowledge statements (pricing model, category focus) phrased
// factually "as of 2026". Competitor names appear in plain text only
// (nominative use) — no logos, no disparagement.

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
  /** 2–3 sentence hero summary — also used as the meta description. */
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

/** Shared UPLY pricing column — single source of truth across all pages. */
const UPLY_PRICING: PricingColumn = {
  heading: "UPLY — one platform, one flat 5%",
  points: [
    "Sell $1,000 → keep $950. Flat 5% platform fee on everything, forever",
    "Starter $97/mo · Unlimited $297/mo · Agency Pro $497/mo — every revenue stream included",
    "14-day free trial (card required) · cancel anytime",
    "Fans and members join free — they only ever pay for what they buy from you",
  ],
};

const PRICING_NOTE =
  "Competitor pricing summarized from publicly available information as of 2026 and may change — always confirm current pricing on the competitor's own site.";

export const COMPARISONS: ComparisonConfig[] = [
  // ── Ticketmaster ────────────────────────────────────────────────────────
  {
    slug: "ticketmaster",
    competitorName: "Ticketmaster",
    tagline: "Enterprise event ticketing",
    heroSummary:
      "UPLY lets independent creators and event hosts keep 95% of every ticket they sell — with QR check-in, a built-in resale marketplace, and a PPV livestream of the show itself. Ticketmaster remains the standard for arena tours and major-venue distribution. Creators pick UPLY because it's a whole operating system around the event — community, email, and a five-agent AI team — with a 14-day free trial to prove it.",
    featureTable: [
      { feature: "Sell tickets online", uply: "Built in — keep 95% of every sale", them: true },
      { feature: "Built for", uply: "Independent creators & event hosts", them: "Major venues, promoters & arena tours" },
      { feature: "Fee on ticket sales", uply: "Flat 5% — you always know your number", them: "Service & processing fees vary per ticket (as of 2026)" },
      { feature: "QR door check-in", uply: "Built in — staff scanners & live occupancy", them: true },
      { feature: "Ticket resale marketplace", uply: "Built in for every event you run", them: "Official resale on select events" },
      { feature: "Livestream the event (pay-per-view)", uply: "Built in — sell a second, virtual ticket", them: false },
      { feature: "Fan community & memberships", uply: "Built in — keep fans between shows", them: false },
      { feature: "Courses & digital products", uply: true, them: false },
      { feature: "Email blasts & SmartLinks", uply: "Built in — fill the next event yourself", them: false },
      { feature: "AI team (ARIA — 5 agents)", uply: "Event copilot, pricing & fraud agents included", them: false },
    ],
    pricing: {
      them: {
        heading: "Ticketmaster — per-ticket fees",
        points: [
          "Free for organizers to list; buyers pay service and processing fees per ticket",
          "Fees vary by event, venue, and agreement — as of 2026",
          "Built around large venues and tour-scale inventory — unmatched for arenas",
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
      "You want to keep 95% of every ticket — sell $1,000, take home $950",
      "You want tickets, resale, QR check-in, and a PPV livestream in one login",
      "You want to own the attendee relationship — emails, memberships, and the next show",
      "You want AI working every event — copilot, pricing intelligence, and fraud watch",
      "You're building an events business under your own brand, not a listing on someone else's",
    ],
    faqs: [
      {
        q: "Can UPLY handle door scanning like a big ticketing platform?",
        a: "Yes. Every UPLY ticket carries a QR code, the built-in scanner app checks attendees in at the door, and you can add staff scanners per event and watch occupancy in real time — no extra hardware contracts, no per-scan fees.",
      },
      {
        q: "Does UPLY have a resale marketplace?",
        a: "Yes — a resale marketplace is built in for your events, so fans can safely resell tickets they can't use while you keep control of the experience (and the fan data) instead of losing both to third-party resellers.",
      },
      {
        q: "How much does UPLY cost per ticket compared to typical ticketing fees?",
        a: "UPLY charges a flat 5%, so you always know your number: sell $1,000 in tickets, keep $950. Traditional ticketing platforms typically add service and processing fees per ticket that vary by event — check any platform's current fee schedule, then do the math on your own ticket price.",
      },
    ],
    verdict:
      "If you're routing arena tours through major venues, Ticketmaster is the incumbent for a reason. If you're building your own events business, UPLY hands you the tickets, the fans, and 95% of the money.",
  },

  // ── HubSpot ─────────────────────────────────────────────────────────────
  {
    slug: "hubspot",
    competitorName: "HubSpot",
    tagline: "B2B CRM & marketing automation",
    heroSummary:
      "UPLY gives creators what a CRM never will: native ways to get paid — streams, tickets, courses, music, and memberships — with email, SmartLinks, and analytics already wired in. HubSpot is a leading CRM and marketing automation suite built for B2B sales and marketing teams. Creators pick UPLY because it's one all-in-one OS with a 95% payout, a five-agent AI team, and a 14-day free trial — no stack assembly required.",
    featureTable: [
      { feature: "Built for", uply: "Creators & creator businesses", them: "B2B sales & marketing teams" },
      { feature: "Contact / audience management", uply: "Members, fans & subscribers — tied to real revenue", them: "Full-featured CRM" },
      { feature: "Email marketing", uply: "Blasts + SmartLinks with analytics — included", them: "Advanced automation & sequences" },
      { feature: "Sell subscriptions & memberships", uply: "Built in — keep 95%", them: "Via integrations" },
      { feature: "Live streaming + tips + PPV", uply: "Built in — monetized from day one", them: false },
      { feature: "Courses & community", uply: true, them: false },
      { feature: "Event ticketing + QR check-in", uply: true, them: false },
      { feature: "Music releases & live shopping", uply: true, them: false },
      { feature: "AI assistance", uply: "ARIA — a 5-agent AI team working your business", them: "AI features across its hubs" },
      { feature: "White-label branding", uply: "Agency Pro plan", them: false },
    ],
    pricing: {
      them: {
        heading: "HubSpot — tiered hubs & seats",
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
      "You make money from an audience — and want the payment rails built in, at 95% to you",
      "One login replaces a CRM, an email tool, a link page, a course host, and a ticketing platform",
      "You want AI that promotes your work — clips, posts, emails — not just scores your leads",
      "You want pricing that stays flat while your audience grows — no per-contact math",
      "You want everything under your brand, all the way to white-label on Agency Pro",
    ],
    faqs: [
      {
        q: "Is UPLY a CRM replacement?",
        a: "Not for a B2B sales team — UPLY doesn't do deal pipelines or rep quotas. But if your 'CRM' is really your fan list, UPLY does the part that matters: it manages members and subscribers, sends the emails, tracks SmartLink analytics, and ties all of it to revenue you keep 95% of.",
      },
      {
        q: "Can UPLY send marketing emails like an automation suite?",
        a: "UPLY includes email blasts with analytics, sent from a dedicated sending domain — built for what creators actually send: drops, events, and streams. You skip the automation-suite learning curve and the per-contact pricing that usually comes with it.",
      },
      {
        q: "Can I use UPLY and a CRM together?",
        a: "Yes. If you have a genuine sales motion, keep a CRM for business development and run the audience side — content, community, ticketing, and payments — on UPLY. For most creators, UPLY alone covers the whole job.",
      },
    ],
    verdict:
      "If you manage pipelines and reps, HubSpot is built for you. If you monetize an audience, UPLY is the operating system built for that business — everything included, 95% yours.",
  },

  // ── Whop ────────────────────────────────────────────────────────────────
  {
    slug: "whop",
    competitorName: "Whop",
    tagline: "Digital product marketplace",
    heroSummary:
      "UPLY is a full creator operating system — digital products and paid communities plus native live streaming, event ticketing with QR check-in and resale, music releases, and live shopping, at a flat 5% so creators keep 95%. Whop is a fast-growing marketplace for digital products and paid communities. Creators pick UPLY for the breadth, the predictable flat fee, the ARIA AI team, and a 14-day free trial.",
    featureTable: [
      { feature: "Sell digital products & paid communities", uply: "Built in — keep 95%", them: true },
      { feature: "Discovery", uply: "Creator discovery feed + Roku TV channel", them: "Marketplace discovery" },
      { feature: "Fee on sales", uply: "Flat 5% — same on every product, forever", them: "Percentage fee per sale (varies, as of 2026)" },
      { feature: "Live streaming + tips + PPV", uply: "Built in — go live and get paid", them: false },
      { feature: "Courses / classroom", uply: "Full course builder wired into community", them: "Course apps available" },
      { feature: "Event ticketing + QR check-in + resale", uply: true, them: false },
      { feature: "Music releases", uply: true, them: false },
      { feature: "Live shopping", uply: true, them: false },
      { feature: "Email blasts & SmartLinks", uply: "Built in — your list, reachable anytime", them: "Limited" },
      { feature: "AI team (ARIA — 5 agents)", uply: true, them: false },
      { feature: "White-label branding", uply: "Agency Pro plan", them: false },
    ],
    pricing: {
      them: {
        heading: "Whop — pay per sale",
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
      "Your business is bigger than downloads — streams, events, music, live shopping",
      "You want a flat 5% you can plan around, not a fee that varies by product and checkout",
      "You want your storefront under your own brand, not inside a marketplace's",
      "You want your fans on your list — email them directly, no marketplace in between",
      "You want ARIA repurposing every stream into clips, posts, and emails",
    ],
    faqs: [
      {
        q: "Does UPLY support paid communities like a digital-product marketplace does?",
        a: "Yes — and more around them. UPLY includes community spaces with gated content, memberships, and a full course builder, then adds live streaming, ticketing, and music releases on top, so your community becomes one part of a bigger business you own.",
      },
      {
        q: "How do fees compare?",
        a: "UPLY is a flat 5% plus a monthly plan — sell $1,000, keep $950, every time. Marketplace-style platforms typically take a percentage per sale that varies by product and checkout flow (as of 2026). At meaningful revenue, the flat 5% usually keeps more in your pocket — run your own numbers.",
      },
      {
        q: "Can fans find me on UPLY without me driving all the traffic?",
        a: "Yes — UPLY has a creator discovery feed and a Roku TV channel for founding creators, so fans can find you inside the platform. And because the list is yours, every fan you convert stays reachable by email — no algorithm in between.",
      },
    ],
    verdict:
      "If you only sell digital goods and want marketplace foot traffic, Whop fits. If you're building a full creator business, UPLY is the operating system for it — one flat 5%, everything included.",
  },

  // ── Skool ───────────────────────────────────────────────────────────────
  {
    slug: "skool",
    competitorName: "Skool",
    tagline: "Community & courses",
    heroSummary:
      "UPLY gives you community and a full classroom — then everything a creator business needs around them: live streaming with tips and PPV, ticketed events with QR check-in, music releases, email blasts, and a five-agent AI team, with 95% of every sale staying yours. Skool is a popular choice for simple, gamified communities with courses attached. Creators pick UPLY so members, events, and revenue live in one place — free to try for 14 days.",
    featureTable: [
      { feature: "Community spaces & feed", uply: "Built in — gated content & memberships", them: "Gamified communities (levels, leaderboards)" },
      { feature: "Courses / classroom", uply: "Full course builder — included", them: true },
      { feature: "Live streaming with tips & PPV", uply: "Built in — get paid while you're live", them: false },
      { feature: "Event ticketing + QR check-in", uply: "Built in — keep 95% of every ticket", them: false },
      { feature: "Ticket resale marketplace", uply: true, them: false },
      { feature: "Music releases & live shopping", uply: true, them: false },
      { feature: "Email tools", uply: "Email blasts + SmartLinks with analytics", them: "Community email digests" },
      { feature: "AI team (ARIA — 5 agents)", uply: true, them: false },
      { feature: "AI content repurposing", uply: "Every video becomes clips, posts & emails", them: false },
      { feature: "Sub-accounts & white-label", uply: "Agency Pro plan", them: false },
      { feature: "Fee on sales", uply: "Flat 5% — creators keep 95%", them: "Monthly price per group + transaction fee (as of 2026)" },
    ],
    pricing: {
      them: {
        heading: "Skool — per-group monthly price",
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
      "You run events, streams, or drops alongside your community — one roof, one login",
      "Your members can buy more than access — tickets, courses, PPV streams, music",
      "You want real email blasts and SmartLinks with analytics, not just digests",
      "You want ARIA turning your content into clips, posts, and emails automatically",
      "You want sub-accounts and white-label ready when you scale (Agency Pro)",
    ],
    faqs: [
      {
        q: "Does UPLY have communities and courses like a community platform?",
        a: "Yes — UPLY includes community spaces with feeds and gated content plus a full course builder. The difference is everything around them: live streaming, ticketing, music, email, and AI are native, so your community grows into a business without a single integration.",
      },
      {
        q: "I only need a community today. Is UPLY overkill?",
        a: "If one community is truly all you'll ever run, a single-purpose tool may be cheaper. But most creators grow — an event here, a stream there, a paid drop — and re-platforming members later is painful. On UPLY they never move; the 14-day trial is a cheap way to find out.",
      },
      {
        q: "Can I migrate an existing community to UPLY?",
        a: "Yes — invite your members with a link; their accounts are free. You rebuild course content in the UPLY classroom builder, and from day one your community sits next to ticketing, streaming, and email instead of on an island.",
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
      "UPLY is built on a simple idea: own your audience and keep 95% of everything they buy — memberships, tickets, courses, streams, and music. Fiverr is one of the largest freelance marketplaces, matching buyers with sellers per order for a commission. Creators pick UPLY to stop renting demand order by order and start compounding it — with an all-in-one OS, a five-agent AI team, and a 14-day free trial.",
    featureTable: [
      { feature: "Core model", uply: "Sell to an audience you own", them: "Marketplace gigs for buyers" },
      { feature: "Who owns the customer relationship", uply: "You — your list, your members, your repeat buyers", them: "The marketplace connects you per order" },
      { feature: "Take rate", uply: "Flat 5% — keep $950 of every $1,000", them: "Commission per order (historically around 20%, as of 2026)" },
      { feature: "Recurring memberships & subscriptions", uply: "Built in — predictable monthly revenue", them: "Subscriptions on select services" },
      { feature: "Live streaming + tips + PPV", uply: true, them: false },
      { feature: "Courses & community", uply: true, them: false },
      { feature: "Events + ticketing + QR check-in", uply: true, them: false },
      { feature: "Artist booking", uply: "Message & book artists for shows", them: "Hire freelancers for digital services" },
      { feature: "Email blasts & SmartLinks", uply: true, them: false },
      { feature: "AI tools", uply: "ARIA AI team (5 agents) + repurposing", them: "AI tools for briefs & matching" },
    ],
    pricing: {
      them: {
        heading: "Fiverr — commission per order",
        points: [
          "Free to list services; the platform takes a commission on each order — historically around 20% for sellers, as of 2026",
          "At that rate, $1,000 in orders returns roughly $800 to the seller — confirm current rates",
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
      "You own the customer — your list, your members, your repeat buyers",
      "You keep 95% — on $1,000 in sales that's $950, versus roughly $800 after a ~20% commission",
      "You monetize five ways from one login — memberships, tickets, courses, streams, music",
      "You set prices for your audience instead of competing per gig",
      "ARIA promotes you — repurposing content and drafting the emails that sell the next drop",
    ],
    faqs: [
      {
        q: "Is UPLY a freelance marketplace?",
        a: "No — and that's the point. UPLY is where creators monetize an audience they own: fans subscribe, buy tickets, join courses, and tip during streams, and you keep 95% of all of it. No gig bidding, no per-order commission.",
      },
      {
        q: "Can I sell services on UPLY?",
        a: "You sell what your audience buys — memberships, courses, event tickets, PPV streams, music, and products via live shopping. UPLY also includes artist booking, so venues and hosts can message and book performers directly, on your terms.",
      },
      {
        q: "Which is cheaper for a working creator?",
        a: "Run the numbers. A roughly 20% commission per order (as of 2026) with no monthly fee can suit occasional sellers. With steady revenue the flat 5% wins fast: on $2,000 a month, UPLY's 5% plus the Starter plan still leaves about $200 more in your pocket than a 20% commission would — and the gap widens as you grow.",
      },
    ],
    verdict:
      "If you're selling one-off services to strangers, Fiverr brings the buyers. If you're building an audience that buys from you again and again, UPLY is the operating system for it — and 95% stays with you.",
  },

  // ── Kajabi ──────────────────────────────────────────────────────────────
  {
    slug: "kajabi",
    competitorName: "Kajabi",
    tagline: "Knowledge-business platform",
    heroSummary:
      "UPLY covers courses and community — then keeps going where knowledge platforms stop: live streaming with tips and PPV, ticketed events with QR check-in and resale, music releases, live shopping, and a five-agent AI team. Kajabi is a polished platform for courses, coaching, and funnels, with 0% transaction fees on its paid plans. Creators pick UPLY to run the whole business from one login, keep 95% of every sale, and start with a 14-day free trial.",
    featureTable: [
      { feature: "Courses & coaching products", uply: "Full classroom, wired into community & payments", them: true },
      { feature: "Community", uply: true, them: true },
      { feature: "Email marketing", uply: "Email blasts + SmartLinks with analytics", them: "Email campaigns & funnels" },
      { feature: "Websites & funnels", uply: "Creator profile, storefront & SmartLinks", them: "Funnel & website builder" },
      { feature: "Live streaming + tips + PPV", uply: "Built in — teach live, get tipped live", them: false },
      { feature: "Event ticketing + QR check-in + resale", uply: "Built in — keep 95% of every ticket", them: false },
      { feature: "Music releases & live shopping", uply: true, them: false },
      { feature: "AI", uply: "ARIA AI team (5 agents) + content repurposing", them: "AI creator tools" },
      { feature: "Transaction fee", uply: "Flat 5% — funds streams, tickets, music & the AI team", them: "0% on paid plans (as of 2026)" },
      { feature: "White-label & Roku TV channel", uply: "Agency Pro plan", them: false },
    ],
    pricing: {
      them: {
        heading: "Kajabi — tiered monthly plans",
        points: [
          "Tiered monthly plans for knowledge businesses, as of 2026",
          "0% transaction fees on paid plans (payment processing still applies)",
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
      "One flat fee covers what would otherwise be several subscriptions — courses, streaming, ticketing, email",
      "You want tickets and PPV streams sold to the same audience that buys your courses",
      "You want ARIA turning every lesson and stream into clips, posts, and emails",
      "You want a white-label path and a Roku TV channel as you scale (Agency Pro)",
    ],
    faqs: [
      {
        q: "Is UPLY's course builder comparable to a dedicated course platform?",
        a: "UPLY's classroom covers structured courses with lessons, modules, and gated access, wired straight into your community and payments. Dedicated course platforms go deeper on funnels and automation; UPLY goes wider across your whole creator business — and for most creators, wide is what compounds.",
      },
      {
        q: "UPLY charges 5% — some course platforms charge 0%. Why pay it?",
        a: "Fair question. If you only ever sell courses, a 0% transaction fee on a paid plan (as of 2026) is genuinely competitive. UPLY's flat 5% buys the rest of the business: live streaming with tips and PPV, ticketing with QR check-in and resale, music, live shopping, and the ARIA AI team. Replace two or three other subscriptions and the flat fee usually comes out ahead.",
      },
      {
        q: "Can I move my course content to UPLY?",
        a: "Yes — you rebuild your curriculum in UPLY's classroom builder (lessons, modules, gating) and invite students with free member accounts. There's no import fee, and the 14-day trial is enough time to test the move before you commit.",
      },
    ],
    verdict:
      "If your business is purely courses and funnels, Kajabi is a strong pick. If you teach and perform and host, UPLY runs the whole business — one login, flat 5%, everything under your brand.",
  },

  // ── Patreon ─────────────────────────────────────────────────────────────
  {
    slug: "patreon",
    competitorName: "Patreon",
    tagline: "Membership & patronage",
    heroSummary:
      "On UPLY, membership is the beginning, not the whole business: recurring subscriptions plus live streams with tips and PPV, courses, ticketed events, and music releases — with creators keeping 95% of everything. Patreon pioneered fan patronage and remains a household name for recurring support. Creators pick UPLY for the flat 5%, the all-in-one OS, the five-agent ARIA AI team, and a 14-day free trial.",
    featureTable: [
      { feature: "Fan memberships & subscriptions", uply: "Built in — keep 95% of every sub", them: true },
      { feature: "Platform take", uply: "Flat 5% — your rate never creeps up as you grow", them: "Percentage of earnings, varies by plan (as of 2026)" },
      { feature: "Live streaming + tips + PPV", uply: "Built in — full RTMP streaming with chat", them: "Limited" },
      { feature: "Courses / classroom", uply: true, them: false },
      { feature: "Events + ticketing + QR check-in", uply: true, them: false },
      { feature: "Music releases", uply: "Built in — releases your fans can buy", them: "Audio posts & podcast feeds" },
      { feature: "Community", uply: "Community spaces & feeds — a real home for members", them: "Community chat & comments" },
      { feature: "Email tools", uply: "Email blasts + SmartLinks with analytics", them: "Posts & messages to patrons" },
      { feature: "AI team (ARIA — 5 agents)", uply: true, them: false },
      { feature: "White-label & Roku TV channel", uply: "Agency Pro plan", them: false },
    ],
    pricing: {
      them: {
        heading: "Patreon — percentage of earnings",
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
      "You want more ways to earn from the same fans — streams, tickets, courses, music",
      "A flat 5% beats a percentage of everything as your income grows",
      "Your members get a real home — community spaces, gated content, a classroom",
      "You email your list directly, with SmartLink analytics showing what converts",
      "ARIA keeps the content flowing — clips, posts, and emails from every stream",
    ],
    faqs: [
      {
        q: "Can my supporters subscribe to me on UPLY like a membership platform?",
        a: "Yes. Fans create free accounts and subscribe to your space for recurring access to gated content, community, and perks — and you keep 95% of every subscription, with tickets, courses, and PPV streams ready the moment you want to sell more than access.",
      },
      {
        q: "How is UPLY's fee different from a percentage-of-earnings model?",
        a: "UPLY combines a monthly plan with a flat 5% platform fee; membership platforms typically charge no monthly fee but take a percentage of everything you earn (as of 2026). Early on, percentage-only can be cheaper — but as your income grows, the flat 5% leaves more with you every single month. Growth favors the flat fee.",
      },
      {
        q: "Do my fans have to pay for UPLY?",
        a: "No. Member and fan accounts are free — fans only pay for what they choose to buy: subscriptions, tickets, courses, or PPV streams. And whatever they buy, you keep 95%.",
      },
    ],
    verdict:
      "Patreon proved fans will pay creators directly. UPLY turns that support into a full business — memberships plus streams, tickets, courses, and music, with 95% of everything staying yours.",
  },

  // ── Twitch ──────────────────────────────────────────────────────────────
  {
    slug: "twitch",
    competitorName: "Twitch",
    tagline: "Live streaming & gaming",
    heroSummary:
      "UPLY is where streamers keep 95% of subs, tips, and PPV — and own the audience behind the view count, with courses, ticketed events, and merch drops on the same platform the stream lives on. Twitch remains the biggest live-streaming audience in the world. Creators pick UPLY as the business layer: flat-fee pricing, an all-in-one OS, a five-agent AI team, and a 14-day free trial.",
    featureTable: [
      { feature: "Live streaming", uply: "RTMP ingest, HLS playback, stream chat — pro-grade", them: "Industry-standard live platform" },
      { feature: "Revenue share on subscriptions", uply: "You keep 95% — flat 5% platform fee", them: "Revenue share (around 50/50 standard, as of 2026)" },
      { feature: "Tips during streams", uply: "Built in — no third-party tools, keep 95%", them: "Bits & third-party tools" },
      { feature: "Pay-per-view streams", uply: "Built in — turn big moments into box office", them: false },
      { feature: "Built-in viewer discovery", uply: "Discovery feed + Roku TV channel", them: "Massive built-in viewer base — unmatched reach" },
      { feature: "Courses & community spaces", uply: "Built in — your community lives with your stream", them: "Chat; community typically lives off-platform" },
      { feature: "Events + ticketing + QR check-in", uply: true, them: false },
      { feature: "Music releases & live shopping", uply: true, them: false },
      { feature: "Email your audience directly", uply: "Built in — own the relationship, not just the follow", them: false },
      { feature: "AI team (ARIA — 5 agents)", uply: true, them: false },
      { feature: "Monthly cost to creators", uply: "$97–$497 plans (14-day free trial)", them: "Free to stream" },
    ],
    pricing: {
      them: {
        heading: "Twitch — free to stream, revenue share",
        points: [
          "Free for creators to broadcast",
          "Monetization via subs, bits, and ads on a revenue-share basis — around 50/50 on standard subs for most streamers, with improved splits under certain programs, as of 2026",
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
      "You keep 95% of subs, tips, and PPV instead of splitting the upside",
      "You own your audience — their emails and memberships, not just their follows",
      "You sell what a stream alone can't — ticketed events, courses, music, live shopping",
      "PPV streams turn your biggest moments into box-office nights",
      "ARIA clips and repurposes every broadcast while you sleep",
    ],
    faqs: [
      {
        q: "Is UPLY's streaming tech production-grade?",
        a: "Yes — UPLY streams over standard RTMP ingest with HLS playback and real-time chat, on professional video infrastructure. You go live from the same encoder setup (like OBS) you already use — except tips, subs, and PPV pay out at 95%.",
      },
      {
        q: "Can I stream on UPLY and a free platform at the same time?",
        a: "Many creators multistream: free platforms for reach, UPLY for the monetized experience — subscriber streams, PPV events, and tips where you keep 95%. Check the other platform's current exclusivity rules for your account type.",
      },
      {
        q: "Why pay a monthly fee when streaming elsewhere is free?",
        a: "Free platforms monetize you through revenue share; UPLY charges a flat plan plus 5% so your growth pays you, not the platform. On a standard 50/50 split, $1,000 in subs returns about $500 (as of 2026); on UPLY it returns $950. If you earn steadily, the plan pays for itself fast.",
      },
    ],
    verdict:
      "For raw discovery, Twitch's audience is unmatched. For turning viewers into a business you own, UPLY is the operating system — where keeping 95% means your growth pays you.",
  },

  // ── Eventbrite ──────────────────────────────────────────────────────────
  {
    slug: "eventbrite",
    competitorName: "Eventbrite",
    tagline: "Self-service event ticketing",
    heroSummary:
      "UPLY charges a flat 5% on tickets — creators keep 95% — and wraps ticketing into a whole business: QR check-in, resale, wristbands, PPV livestreams of the show itself, plus community and email to fill the next one. Eventbrite made self-service ticketing mainstream and remains a household name for event listings. Hosts pick UPLY for the all-in-one OS, the AI event tooling, and a 14-day free trial.",
    featureTable: [
      { feature: "Create & sell event tickets", uply: "Built in — keep 95% of every sale", them: true },
      { feature: "Fee on paid tickets", uply: "Flat 5% — easy math on any ticket price", them: "Percentage + flat fee per paid ticket (as of 2026)" },
      { feature: "QR door check-in", uply: "Built in — staff roles & live occupancy", them: true },
      { feature: "Ticket resale marketplace", uply: "Built in — you keep control (and the data)", them: false },
      { feature: "Wristbands & multi-day passes", uply: "Built in — festival-ready", them: "Varies by plan" },
      { feature: "Livestream the event (pay-per-view)", uply: "Built in — sell a virtual ticket too", them: false },
      { feature: "Fan community & memberships", uply: "Built in — keep attendees between events", them: false },
      { feature: "Courses, music releases & live shopping", uply: true, them: false },
      { feature: "Email tools", uply: "Email blasts + SmartLinks with analytics", them: "Event email campaigns" },
      { feature: "AI team (ARIA — 5 agents)", uply: "Event copilot, pricing & fraud agents", them: false },
    ],
    pricing: {
      them: {
        heading: "Eventbrite — per-ticket fees",
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
      "You only need ticketing — nothing before or after the event",
    ],
    chooseUply: [
      "You keep 95% of every ticket — one flat fee instead of percentage-plus-flat per ticket",
      "Resale, wristbands, multi-day passes, and PPV livestreams are all built in",
      "You keep the attendee relationship — email list, memberships, and the next show",
      "ARIA works the event with you — copilot, pricing intelligence, and fraud watch",
      "Your events live under your brand, next to your community and content",
    ],
    faqs: [
      {
        q: "Does UPLY handle check-in and door staff like a ticketing platform?",
        a: "Yes. UPLY tickets carry QR codes, the scanner works per event with staff roles, and organizers see live occupancy. Wristbands and multi-day validity are supported for festivals — all included, no add-on tier.",
      },
      {
        q: "How do UPLY's ticket fees compare?",
        a: "UPLY is a flat 5% — sell $1,000 in tickets, keep $950. Self-service ticketing platforms typically charge a percentage plus a flat amount per paid ticket (as of 2026), which adds up fastest on lower-priced tickets. Compare against your average ticket price; the flat 5% is easy math.",
      },
      {
        q: "Can I livestream my event to fans who can't attend?",
        a: "Yes — UPLY supports pay-per-view event livestreams, so remote fans buy access and watch live. It's a second box office for the same show, and you keep 95% of that revenue too.",
      },
    ],
    verdict:
      "For a one-off listing on a household name, Eventbrite works. For hosts building a repeat audience, UPLY keeps 95% of the ticket — and keeps the fans for the next one.",
  },
];

/** Look up a comparison config by slug (case-insensitive). */
export function getComparison(slug: string | undefined): ComparisonConfig | undefined {
  if (!slug) return undefined;
  const s = slug.toLowerCase();
  return COMPARISONS.find((c) => c.slug === s);
}
