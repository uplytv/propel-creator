// UPLY vs X — SEO comparison page configs.
// All copy here is original UPLY copy. Competitor facts are conservative,
// public-knowledge statements (pricing model, category focus) phrased
// neutrally "as of 2026". Competitor names appear in plain text only
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
}

/** Shared UPLY pricing column — single source of truth across all pages. */
const UPLY_PRICING: PricingColumn = {
  heading: "UPLY — one platform, one flat fee",
  points: [
    "Starter $97/mo · Unlimited $297/mo · Agency Pro $497/mo",
    "Creators keep 95% of everything they sell — flat 5% platform fee",
    "14-day free trial (card required) · cancel anytime",
    "Free accounts for members and fans — they never pay to join",
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
      "Ticketmaster is the heavyweight of ticketing — built for major venues, promoters, and arena tours, with distribution and official resale at massive scale. UPLY is an operating system for independent creators: ticketing with QR check-in and a resale marketplace, plus the livestream, community, and email tools to keep fans engaged long after the show — with creators keeping 95% of every sale.",
    featureTable: [
      { feature: "Sell tickets online", uply: true, them: true },
      { feature: "Built for", uply: "Independent creators & event hosts", them: "Major venues, promoters & tours" },
      { feature: "Fee on ticket sales", uply: "Flat 5% — creators keep 95%", them: "Service & processing fees vary per ticket" },
      { feature: "QR door check-in", uply: true, them: true },
      { feature: "Ticket resale marketplace", uply: "Built in for your events", them: "Official resale on select events" },
      { feature: "Livestream the event (pay-per-view)", uply: true, them: false },
      { feature: "Fan community & memberships", uply: true, them: false },
      { feature: "Courses & digital products", uply: true, them: false },
      { feature: "Email blasts & SmartLinks", uply: true, them: false },
      { feature: "AI team (ARIA — 5 agents)", uply: true, them: false },
    ],
    pricing: {
      them: {
        heading: "Ticketmaster — per-ticket fees",
        points: [
          "Free for organizers to list; buyers pay service and processing fees per ticket",
          "Fees vary by event, venue, and agreement — as of 2026",
          "Designed around large venues and tour-scale inventory",
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
      "You're an independent creator or host who wants to keep 95% of ticket revenue",
      "You want ticketing, resale, QR check-in, and a PPV livestream in one place",
      "You want the fan relationship after the event — community, email, and memberships",
    ],
    faqs: [
      {
        q: "Can UPLY handle door scanning like a big ticketing platform?",
        a: "Yes. Every UPLY ticket carries a QR code, and the built-in scanner app checks attendees in at the door. You can add staff scanners per event and watch occupancy in real time.",
      },
      {
        q: "Does UPLY have a resale marketplace?",
        a: "Yes — UPLY includes a resale marketplace for your events, so fans can safely resell tickets they can't use, and you keep control of the experience instead of losing it to third-party resellers.",
      },
      {
        q: "How much does UPLY cost per ticket compared to typical ticketing fees?",
        a: "UPLY charges a flat 5% platform fee, so creators keep 95% of every sale. Traditional ticketing platforms typically add service and processing fees per ticket that vary by event; check any platform's current fee schedule before you compare.",
      },
    ],
  },

  // ── HubSpot ─────────────────────────────────────────────────────────────
  {
    slug: "hubspot",
    competitorName: "HubSpot",
    tagline: "B2B CRM & marketing automation",
    heroSummary:
      "HubSpot is a leading CRM and marketing automation suite for businesses — pipelines, sequences, and reporting built for sales and marketing teams. UPLY is built for creators instead of sales teams: monetization is native (streams, tickets, courses, music), with email blasts, SmartLinks, and an AI team included — no CRM assembly required.",
    featureTable: [
      { feature: "Built for", uply: "Creators & creator businesses", them: "B2B sales & marketing teams" },
      { feature: "Contact / audience management", uply: "Members, fans & subscribers built in", them: "Full-featured CRM" },
      { feature: "Email marketing", uply: "Email blasts + SmartLinks with analytics", them: "Advanced automation & sequences" },
      { feature: "Sell subscriptions & memberships", uply: true, them: "Via integrations" },
      { feature: "Live streaming + tips + PPV", uply: true, them: false },
      { feature: "Courses & community", uply: true, them: false },
      { feature: "Event ticketing + QR check-in", uply: true, them: false },
      { feature: "Music releases & live shopping", uply: true, them: false },
      { feature: "AI assistance", uply: "ARIA AI team (5 agents) + content repurposing", them: "AI features across its hubs" },
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
      "You make money from an audience — streams, tickets, courses, music, memberships",
      "You want email, links, and analytics without assembling a marketing stack",
      "You want AI that works your creator business, not just your sales funnel",
    ],
    faqs: [
      {
        q: "Is UPLY a CRM replacement?",
        a: "Not for a B2B sales team — UPLY doesn't do deal pipelines or rep quotas. But if your 'CRM' is really your fan list, UPLY manages members and subscribers, sends email blasts, tracks SmartLink analytics, and ties it all to actual revenue.",
      },
      {
        q: "Can UPLY send marketing emails like an automation suite?",
        a: "UPLY includes email blasts to your audience with analytics, sent from a dedicated sending domain. It's built for creator announcements — drops, events, streams — rather than multi-step B2B nurture sequences.",
      },
      {
        q: "Can I use UPLY and a CRM together?",
        a: "Yes. Many teams keep a CRM for business development while running the audience side — content, community, ticketing, and payments — on UPLY. They solve different problems.",
      },
    ],
  },

  // ── Whop ────────────────────────────────────────────────────────────────
  {
    slug: "whop",
    competitorName: "Whop",
    tagline: "Digital product marketplace",
    heroSummary:
      "Whop is a fast-growing marketplace for selling digital products and paid communities, with a discovery marketplace and a flexible app system. UPLY goes wider than digital goods: it's a full creator operating system with native live streaming, event ticketing with QR check-in and resale, music releases, live shopping, and an AI team — with a flat 5% fee so creators keep 95%.",
    featureTable: [
      { feature: "Sell digital products & paid communities", uply: true, them: true },
      { feature: "Discovery", uply: "Creator discovery feed + Roku TV channel", them: "Marketplace discovery" },
      { feature: "Fee on sales", uply: "Flat 5% — creators keep 95%", them: "Percentage fee per sale (varies, as of 2026)" },
      { feature: "Live streaming + tips + PPV", uply: true, them: false },
      { feature: "Courses / classroom", uply: "Full course builder with community", them: "Course apps available" },
      { feature: "Event ticketing + QR check-in + resale", uply: true, them: false },
      { feature: "Music releases", uply: true, them: false },
      { feature: "Live shopping", uply: true, them: false },
      { feature: "Email blasts & SmartLinks", uply: true, them: "Limited" },
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
      "Your business includes live events, streams, or music — not just digital downloads",
      "You want a predictable flat 5% fee and a full platform under your own brand",
      "You want an AI team repurposing your content and helping you grow",
    ],
    faqs: [
      {
        q: "Does UPLY support paid communities like a digital-product marketplace does?",
        a: "Yes. UPLY includes community spaces with gated content, memberships, and a full course builder — and adds live streaming, ticketing, and music releases on top, so the community is one part of a bigger business.",
      },
      {
        q: "How do fees compare?",
        a: "UPLY charges a flat 5% platform fee on sales plus a monthly plan, so creators keep 95%. Marketplace-style platforms typically take a percentage per sale with no monthly cost — which model wins depends on your volume; at meaningful revenue, a flat 5% usually keeps more in your pocket.",
      },
      {
        q: "Can fans find me on UPLY without me driving all the traffic?",
        a: "UPLY has a creator discovery feed and a Roku TV channel for founding creators, so fans can discover you inside the platform — but like any platform, your own audience-building still matters most.",
      },
    ],
  },

  // ── Skool ───────────────────────────────────────────────────────────────
  {
    slug: "skool",
    competitorName: "Skool",
    tagline: "Community & courses",
    heroSummary:
      "Skool has nailed simple, gamified communities with courses attached — one price per group, leaderboards, and a clean feed. UPLY includes community and a full classroom too, then adds what a creator business needs around them: live streaming with tips and PPV, event ticketing with QR check-in, music releases, email blasts, and an AI team — with creators keeping 95% of what they sell.",
    featureTable: [
      { feature: "Community spaces & feed", uply: true, them: "Gamified communities (levels, leaderboards)" },
      { feature: "Courses / classroom", uply: true, them: true },
      { feature: "Live streaming with tips & PPV", uply: true, them: false },
      { feature: "Event ticketing + QR check-in", uply: true, them: false },
      { feature: "Ticket resale marketplace", uply: true, them: false },
      { feature: "Music releases & live shopping", uply: true, them: false },
      { feature: "Email tools", uply: "Email blasts + SmartLinks with analytics", them: "Community email digests" },
      { feature: "AI team (ARIA — 5 agents)", uply: true, them: false },
      { feature: "AI content repurposing", uply: true, them: false },
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
      "You run events, streams, or drops alongside your community",
      "You want community + classroom + ticketing + email under one roof and one login",
      "You want AI repurposing your content into clips, posts, and emails automatically",
    ],
    faqs: [
      {
        q: "Does UPLY have communities and courses like a community platform?",
        a: "Yes — UPLY includes community spaces with feeds and gated content plus a full course builder (classroom). The difference is everything around them: live streaming, ticketing, music, email, and AI are native, not integrations.",
      },
      {
        q: "I only need a community today. Is UPLY overkill?",
        a: "If a single community is genuinely all you'll ever run, a single-purpose tool may be cheaper. Creators pick UPLY when they know events, streams, or product drops are coming and don't want to re-platform their members later.",
      },
      {
        q: "Can I migrate an existing community to UPLY?",
        a: "Yes — you can invite your members to your UPLY space with a link, and member accounts are free. Course content is re-created in the UPLY classroom builder.",
      },
    ],
  },

  // ── Fiverr ──────────────────────────────────────────────────────────────
  {
    slug: "fiverr",
    competitorName: "Fiverr",
    tagline: "Freelance services marketplace",
    heroSummary:
      "Fiverr is a giant freelance marketplace — buyers search for services, and freelancers compete for gigs with the platform taking a commission on each order. UPLY flips the model: instead of renting demand from a marketplace, creators build and own their audience, then monetize it directly — streams, courses, tickets, music, bookings — keeping 95% of every sale.",
    featureTable: [
      { feature: "Core model", uply: "Sell to your own audience", them: "Marketplace gigs for buyers" },
      { feature: "Who owns the customer relationship", uply: "You — your list, your members", them: "The marketplace connects you per order" },
      { feature: "Take rate", uply: "Flat 5% — creators keep 95%", them: "Commission per order (historically around 20%, as of 2026)" },
      { feature: "Recurring memberships & subscriptions", uply: true, them: "Subscriptions on select services" },
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
          "Buyers also pay service fees at checkout",
          "No monthly subscription required to sell",
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
      "You have (or are building) an audience and want to own that relationship",
      "You monetize in multiple ways — memberships, tickets, courses, streams, music",
      "You want to keep 95% instead of paying a marketplace commission on every order",
    ],
    faqs: [
      {
        q: "Is UPLY a freelance marketplace?",
        a: "No. UPLY is a platform where creators monetize their own audience directly. There's no gig bidding — fans subscribe, buy tickets, join courses, and tip during streams, and creators keep 95%.",
      },
      {
        q: "Can I sell services on UPLY?",
        a: "You can sell what your audience buys — memberships, courses, event tickets, PPV streams, music, and products via live shopping. UPLY also includes artist booking, so venues and hosts can message and book performers directly.",
      },
      {
        q: "Which is cheaper for a working creator?",
        a: "It depends on volume. A marketplace commission of roughly 20% per order with no monthly fee can suit occasional sellers; UPLY's flat 5% plus a monthly plan usually keeps more for creators with steady revenue. Do the math on your own numbers.",
      },
    ],
  },

  // ── Kajabi ──────────────────────────────────────────────────────────────
  {
    slug: "kajabi",
    competitorName: "Kajabi",
    tagline: "Knowledge-business platform",
    heroSummary:
      "Kajabi is a polished platform for knowledge businesses — courses, coaching, funnels, and email in one place, with no transaction fees on its paid plans. UPLY covers courses and community too, then extends into what knowledge platforms don't touch: live streaming with tips and PPV, event ticketing with QR check-in and resale, music releases, live shopping, and a five-agent AI team.",
    featureTable: [
      { feature: "Courses & coaching products", uply: true, them: true },
      { feature: "Community", uply: true, them: true },
      { feature: "Email marketing", uply: "Email blasts + SmartLinks with analytics", them: "Email campaigns & funnels" },
      { feature: "Websites & funnels", uply: "Creator profile, storefront & SmartLinks", them: "Funnel & website builder" },
      { feature: "Live streaming + tips + PPV", uply: true, them: false },
      { feature: "Event ticketing + QR check-in + resale", uply: true, them: false },
      { feature: "Music releases & live shopping", uply: true, them: false },
      { feature: "AI", uply: "ARIA AI team (5 agents) + content repurposing", them: "AI creator tools" },
      { feature: "Transaction fee", uply: "Flat 5% — creators keep 95%", them: "0% on paid plans (as of 2026)" },
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
      "You want ticketing, live streams, and music alongside your courses",
      "You want an AI team turning every video into clips, posts, and emails",
    ],
    faqs: [
      {
        q: "Is UPLY's course builder comparable to a dedicated course platform?",
        a: "UPLY's classroom covers structured courses with lessons and gated access, wired directly into your community and payments. Dedicated course platforms go deeper on funnels and marketing automation; UPLY goes wider across your whole creator business.",
      },
      {
        q: "UPLY charges 5% — some course platforms charge 0%. Why pay it?",
        a: "The 5% covers a much wider platform: live streaming with tips and PPV, ticketing with QR check-in and resale, music, live shopping, and the ARIA AI team. If you'd otherwise stitch together several tools, one flat fee is often cheaper overall.",
      },
      {
        q: "Can I move my course content to UPLY?",
        a: "Yes — you rebuild your curriculum in UPLY's classroom builder (lessons, modules, gating) and invite students with free member accounts. There's no import fee, and the 14-day trial is enough time to test the move.",
      },
    ],
  },

  // ── Patreon ─────────────────────────────────────────────────────────────
  {
    slug: "patreon",
    competitorName: "Patreon",
    tagline: "Membership & patronage",
    heroSummary:
      "Patreon pioneered fan membership — recurring support with tiered perks, taking a percentage of creator earnings as its fee. UPLY treats membership as one revenue stream among many: subscriptions plus live streams with tips and PPV, courses, event ticketing, music releases, and email — on flat-fee pricing where creators keep 95% of everything.",
    featureTable: [
      { feature: "Fan memberships & subscriptions", uply: true, them: true },
      { feature: "Platform take", uply: "Flat 5% — creators keep 95%", them: "Percentage of earnings, varies by plan (as of 2026)" },
      { feature: "Live streaming + tips + PPV", uply: true, them: "Limited" },
      { feature: "Courses / classroom", uply: true, them: false },
      { feature: "Events + ticketing + QR check-in", uply: true, them: false },
      { feature: "Music releases", uply: true, them: "Audio posts & podcast feeds" },
      { feature: "Community", uply: "Community spaces & feeds", them: "Community chat & comments" },
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
      "Membership is one of several revenue streams — you also stream, teach, or host events",
      "At your revenue level, a flat 5% beats a percentage-of-earnings fee",
      "You want your membership living inside a full community, not a feed of posts",
    ],
    faqs: [
      {
        q: "Can my supporters subscribe to me on UPLY like a membership platform?",
        a: "Yes. Fans create free accounts and subscribe to your space for recurring access to gated content, community, and perks. You keep 95% of subscription revenue.",
      },
      {
        q: "How is UPLY's fee different from a percentage-of-earnings model?",
        a: "UPLY combines a monthly plan with a flat 5% platform fee. Membership platforms typically charge no monthly fee but take a percentage of everything you earn. As your income grows, the flat 5% generally leaves more with you — run your own numbers.",
      },
      {
        q: "Do my fans have to pay for UPLY?",
        a: "No. Member and fan accounts are free — fans only pay for what they choose to buy: subscriptions, tickets, courses, or PPV streams.",
      },
    ],
  },

  // ── Twitch ──────────────────────────────────────────────────────────────
  {
    slug: "twitch",
    competitorName: "Twitch",
    tagline: "Live streaming & gaming",
    heroSummary:
      "Twitch is the biggest name in live streaming, with a massive built-in viewer base and monetization through subs, bits, and ads on a revenue-share model. UPLY is the business layer streamers eventually need: keep 95% of subs, tips, and PPV streams, own your audience list, and run courses, events, and merch drops from the same platform your stream lives on.",
    featureTable: [
      { feature: "Live streaming", uply: "RTMP ingest, HLS playback, stream chat", them: "Industry-standard live platform" },
      { feature: "Revenue share on subscriptions", uply: "Creators keep 95%", them: "Revenue share (around 50/50 standard, as of 2026)" },
      { feature: "Tips during streams", uply: "Built in", them: "Bits & third-party tools" },
      { feature: "Pay-per-view streams", uply: true, them: false },
      { feature: "Built-in viewer discovery", uply: "Discovery feed + Roku TV channel", them: "Massive built-in viewer base" },
      { feature: "Courses & community spaces", uply: true, them: "Chat; community typically lives off-platform" },
      { feature: "Events + ticketing + QR check-in", uply: true, them: false },
      { feature: "Music releases & live shopping", uply: true, them: false },
      { feature: "Email your audience directly", uply: true, them: false },
      { feature: "AI team (ARIA — 5 agents)", uply: true, them: false },
      { feature: "Monthly cost to creators", uply: "$97–$497 plans (14-day free trial)", them: "Free to stream" },
    ],
    pricing: {
      them: {
        heading: "Twitch — free to stream, revenue share",
        points: [
          "Free for creators to broadcast",
          "Monetization via subs, bits, and ads on a revenue-share basis — around 50/50 on standard subs for most streamers, with improved splits under certain programs, as of 2026",
          "Payouts subject to eligibility thresholds",
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
      "You already have an audience and want to keep 95% instead of a revenue split",
      "You want PPV streams, ticketed events, and courses attached to your channel",
      "You want to own your audience — their emails, not just their follows",
    ],
    faqs: [
      {
        q: "Is UPLY's streaming tech production-grade?",
        a: "Yes — UPLY streams over standard RTMP ingest with HLS playback and real-time chat, powered by professional video infrastructure. You go live from the same encoder setup (like OBS) you already use.",
      },
      {
        q: "Can I stream on UPLY and a free platform at the same time?",
        a: "Many creators multistream: free platforms for reach, UPLY for the monetized experience — subscriber streams, PPV events, and tips where you keep 95%. Check the other platform's current exclusivity rules for your account type.",
      },
      {
        q: "Why pay a monthly fee when streaming elsewhere is free?",
        a: "Free platforms monetize you through revenue share; UPLY charges a flat plan plus 5% so the upside of your growth stays with you. If you earn steadily from subs, tips, or PPV, keeping 95% typically outweighs the plan cost quickly.",
      },
    ],
  },

  // ── Eventbrite ──────────────────────────────────────────────────────────
  {
    slug: "eventbrite",
    competitorName: "Eventbrite",
    tagline: "Self-service event ticketing",
    heroSummary:
      "Eventbrite made self-service ticketing mainstream — anyone can list an event, sell tickets, and check people in, with per-ticket fees on paid events. UPLY wraps ticketing into a whole creator business: a flat 5% fee, QR check-in, a resale marketplace, PPV livestreams of the event itself, and the community and email tools to fill the next one.",
    featureTable: [
      { feature: "Create & sell event tickets", uply: true, them: true },
      { feature: "Fee on paid tickets", uply: "Flat 5% — creators keep 95%", them: "Percentage + flat fee per paid ticket (as of 2026)" },
      { feature: "QR door check-in", uply: true, them: true },
      { feature: "Ticket resale marketplace", uply: true, them: false },
      { feature: "Wristbands & multi-day passes", uply: true, them: "Varies by plan" },
      { feature: "Livestream the event (pay-per-view)", uply: true, them: false },
      { feature: "Fan community & memberships", uply: true, them: false },
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
      "Events are part of a bigger creator business — community, streams, and drops",
      "You want resale, wristbands, PPV livestreams, and AI event tooling built in",
      "You want the attendee relationship after the show — email list, members, next event",
    ],
    faqs: [
      {
        q: "Does UPLY handle check-in and door staff like a ticketing platform?",
        a: "Yes. UPLY tickets carry QR codes, the scanner works per event with staff roles, and organizers see live occupancy. Wristbands and multi-day validity are supported for festivals.",
      },
      {
        q: "How do UPLY's ticket fees compare?",
        a: "UPLY charges a flat 5% platform fee on ticket sales — creators keep 95%. Self-service ticketing platforms typically charge a percentage plus a flat amount per paid ticket; compare against your average ticket price to see which wins for your events.",
      },
      {
        q: "Can I livestream my event to fans who can't attend?",
        a: "Yes — UPLY supports pay-per-view event livestreams, so remote fans buy access and watch live. It's a second ticket type for the same show, and you keep 95% of that revenue too.",
      },
    ],
  },
];

/** Look up a comparison config by slug (case-insensitive). */
export function getComparison(slug: string | undefined): ComparisonConfig | undefined {
  if (!slug) return undefined;
  const s = slug.toLowerCase();
  return COMPARISONS.find((c) => c.slug === s);
}
