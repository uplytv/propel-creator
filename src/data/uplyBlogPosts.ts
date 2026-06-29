/**
 * UPLY editorial blog. Hand-written long-form posts that explain what
 * the platform does, how creators use it, and how it compares to the
 * legacy tools they're paying way too much for. Add new posts here and
 * they automatically appear on /blog and resolve at /blog/:slug.
 */

import portraitAsset from "@/assets/arya-xo-portrait-v3.jpg.asset.json";
import bandsAsset from "@/assets/150bands-cover.jpg.asset.json";
import getdownAsset from "@/assets/getdown-cover.jpg.asset.json";
import bgAsset from "@/assets/arya-xo-bg.png.asset.json";

export interface BlogSection {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
  pullquote?: string;
}

export interface UplyBlogPost {
  slug: string;
  category: string;
  title: string;
  subtitle: string;
  excerpt: string;
  author: string;
  date: string;
  readMinutes: number;
  cover: string;
  tags: string[];
  sections: BlogSection[];
}

export const UPLY_BLOG_POSTS: UplyBlogPost[] = [
  {
    slug: "what-uply-actually-does",
    category: "The Operating System",
    title: "What UPLY actually does — and how every kind of creator uses it",
    subtitle:
      "Artists, filmmakers, teachers, influencers — one platform, six tools, ninety-five percent of the money stays with you.",
    excerpt:
      "A working tour of UPLY: live streaming, paid video, courses, ticketed events, communities, link-in-bio, and the AI agent that keeps it all moving — explained for the four creators we built it for.",
    author: "The UPLY Desk",
    date: "2026-06-29",
    readMinutes: 9,
    cover: bgAsset.url,
    tags: ["platform", "guide", "creators"],
    sections: [
      {
        paragraphs: [
          "Most creator tools were built to solve one problem and bill you forever. Streaming on one site, courses on a second, tickets on a third, a fourth for your link-in-bio, a fifth for community chat, a sixth that takes 30% of your merch. By the time you've paid all of them you're running a small media company just to break even.",
          "UPLY collapses that entire stack into one product. You keep ninety-five percent of every dollar. The other five percent runs the platform. There is no upsell tier that unlocks the basics.",
        ],
      },
      {
        heading: "The six surfaces, in plain English",
        list: [
          "Live — broadcast to the web, your community, your TV channel, or external platforms (YouTube, Twitch, Kick) at the same time with simulcast.",
          "Video — upload, monetize, and gate full-length videos, shorts, and clips. Mux-grade playback with auto-recovery.",
          "Courses — Skool-style classrooms with modules, gated content, progress, and direct payouts.",
          "Events & Tickets — sell wristband, tiered, and resale tickets with QR check-in. Works for a 50-cap show or a 5,000-cap festival.",
          "Communities — paid memberships, free trials, broadcast channels, group chats, and 1:1 paid DMs.",
          "Pages — link-in-bio, custom landing pages, and a full artist site on your own domain.",
        ],
      },
      {
        heading: "If you're an artist",
        paragraphs: [
          "Drop a single, drop a documentary, drop a tour — same platform. Push the song to your community first, livestream the listening party, sell front-row tickets and a VIP livestream PPV for fans who can't fly in, and then turn the night into a Vault video your subscribers keep forever.",
          "Your Spotify, Apple Music, and merch all sit on a single Arya XO-style artist site you can ship in an afternoon. No webmaster, no Squarespace tax.",
        ],
      },
      {
        heading: "If you're a filmmaker",
        paragraphs: [
          "Premiere your film as a one-night global PPV event. Sell tickets the way a theater would, but to the entire internet. Bundle the screening with a paid Q&A in the same room. Archive it the next morning as a rental on your channel.",
          "Pre-roll trailers run from your own UPLY page. The producer gets the money the same week the screening ends.",
        ],
      },
      {
        heading: "If you're a teacher",
        paragraphs: [
          "Build a cohort course in the classroom. Run a live office-hours stream every Thursday. Sell a private community membership that includes both. When a student finishes a module, the AI agent suggests the next one based on what other learners did.",
          "You aren't stitching Kajabi, Circle, Calendly, and Zoom together. You're running one product.",
        ],
      },
      {
        heading: "If you're an influencer",
        paragraphs: [
          "Your link-in-bio, your shoppable video feed, your live shopping streams, your paid DM inbox, your brand deal marketplace — every revenue surface for the modern influencer is built in and unified.",
          "Brand deals come into a single inbox with structured proposals, contracts, and payouts. Live shopping uses the same player as your VOD. Conversion is tracked from view to sale automatically.",
        ],
      },
      {
        pullquote:
          "Six tools, one login, one payout, one AI working for you in the background. That's the whole pitch.",
      },
      {
        heading: "And the AI agent",
        paragraphs: [
          "Every creator on UPLY gets ARIA — an autonomous Claude-powered agent that watches your analytics, writes your weekly report, plans tour cities based on listener density, drafts SEO copy for your pages, prices your events, and flags fraud in your ticket sales. It's not a sidebar widget. It runs in the background and pings you when there's a real move to make.",
        ],
      },
    ],
  },
  {
    slug: "ppv-events-on-uply",
    category: "Monetization",
    title: "Turn any event — virtual or in real life — into a PPV moneymaker",
    subtitle:
      "Pay-per-view doesn't belong to UFC and boxing anymore. It belongs to every creator with a room full of fans and a phone with a camera.",
    excerpt:
      "How UPLY's PPV layer lets you double-dip on every event you already run: keep the in-person ticket revenue and unlock a second global audience that pays to watch from anywhere.",
    author: "The UPLY Desk",
    date: "2026-06-29",
    readMinutes: 7,
    cover: bandsAsset.url,
    tags: ["events", "ppv", "tickets", "revenue"],
    sections: [
      {
        paragraphs: [
          "Here is the math nobody wants to tell you: the room you just sold out is a hard cap on your revenue. Five hundred seats, eight hundred seats, sold-out doesn't mean you're done — it means you stopped selling.",
          "UPLY's PPV layer removes that cap. Every event you create — a concert, a comedy set, a watch party, a workshop, a film premiere, a private speech, a wedding, a fight night — can be flipped to pay-per-view in two taps. The fans who couldn't get a ticket, or couldn't fly in, pay to watch live from anywhere.",
        ],
      },
      {
        heading: "How it works",
        list: [
          "Create the event. Set the in-person tier the way you normally would.",
          "Add a PPV tier. Pick a price for the global livestream pass.",
          "Optionally add a VIP PPV tier — multi-cam, backstage feed, post-show Q&A, downloadable replay.",
          "Stream it. Mux delivers it to every paid viewer with auto-recovery and adaptive bitrate.",
          "Replay window. The same ticket unlocks the recording for 48 hours, a week, or forever — your call.",
        ],
      },
      {
        heading: "Why creators are switching",
        paragraphs: [
          "A 600-cap club show at $40 a ticket = $24,000. The same show with a $15 PPV pass and 2,400 remote viewers = an extra $36,000. The room didn't change. The lighting didn't change. The setlist didn't change. You added a camera, a price, and a button.",
          "And the PPV audience is exactly the audience you want — fans who are willing to pay to see you and live somewhere you don't tour. That data goes straight into your CRM, your tour planning, and ARIA's city recommendations.",
        ],
      },
      {
        pullquote:
          "The room is the bottleneck. PPV is how you sell the room a second time, to the rest of the world.",
      },
      {
        heading: "Built-in protections",
        list: [
          "Geo-restriction, age-gating, and watermark overlays per viewer.",
          "Single-device playback enforcement to kill credential sharing.",
          "Automatic refund triggers if the stream drops below the broadcast SLA.",
          "Encrypted RTMP keys and fraud-sentinel monitoring on every checkout.",
        ],
      },
      {
        paragraphs: [
          "The platform fee is the same five percent you pay on everything else on UPLY. There is no PPV upcharge. There is no per-viewer tax. The first PPV event most creators run pays for the entire platform for the year, several times over.",
        ],
      },
    ],
  },
  {
    slug: "why-uply-beats-ticketmaster",
    category: "The Industry",
    title: "Why UPLY is what Ticketmaster and Live Nation should have been",
    subtitle:
      "We don't charge a 30% service fee. We don't sell your audience to the highest bidder. We don't lock you into the venue. We're the part of the music industry the music industry forgot to build.",
    excerpt:
      "Ticketmaster takes 27-37% in fees. Live Nation owns the venue, the tickets, the merch, and your data. UPLY does the opposite — 5% flat, your audience, your data, your money.",
    author: "The UPLY Desk",
    date: "2026-06-29",
    readMinutes: 8,
    cover: getdownAsset.url,
    tags: ["ticketing", "industry", "comparison"],
    sections: [
      {
        paragraphs: [
          "A $50 ticket on Ticketmaster lands at the buyer's checkout as $68. The artist sees something between $20 and $30 of that, depending on what the venue and the promoter take. Roughly half the money the fan paid never reaches the person they came to see.",
          "Live Nation owns the venue, the ticketing rails, the promoter, and increasingly the artist deal. The flywheel is engineered against the buyer and the performer at the same time. The Department of Justice has been suing them about it for two years. The industry knows it. Nobody on the inside is incentivized to build a better one.",
          "So we built it.",
        ],
      },
      {
        heading: "What UPLY does differently",
        list: [
          "Five percent flat platform fee. No service fee, no order processing fee, no convenience fee, no facility fee, no fuel surcharge, no whatever-they-invent-next fee.",
          "The artist's payout hits their Stripe account the same week, not 60 days after the show.",
          "The fan's email and phone belong to the artist, not to a third-party reseller who's about to upsell them a credit card.",
          "Tier pricing, wristband upgrades, resale, refunds, and PPV livestream of the same show all live in one product.",
          "QR check-in, GPS validation, real-time occupancy, and staff scanning ship out of the box for a 50-cap room or a 50,000-cap festival.",
          "AI pricing intelligence suggests where demand is hot before tickets even go on sale.",
        ],
      },
      {
        pullquote:
          "Ticketmaster's product is the fee. Our product is the artist getting paid.",
      },
      {
        heading: "What the math actually looks like",
        paragraphs: [
          "Sell 1,000 tickets at $50. Through the legacy stack, the fan pays roughly $68,000 and the artist sees roughly $25,000 after venue cut, promoter cut, and service fees.",
          "Sell the same 1,000 tickets on UPLY at $50. The fan pays $50,000. The artist nets $47,500. The fan saved $18,000. The artist made an extra $22,500. The math is not subtle.",
        ],
      },
      {
        heading: "Why nobody else does this",
        paragraphs: [
          "Because the existing players are public companies whose quarterly earnings depend on fee maximization. You cannot run a 5% platform if your shareholders need a 37% one. The model is structurally incompatible with the customer.",
          "UPLY is a bootstrapped, creator-owned platform. The economics work because we are not stapled to a venue empire. We don't need to dip your fans twice.",
        ],
      },
    ],
  },
  {
    slug: "six-platforms-one-login-one-ai",
    category: "The Operating System",
    title: "Six platforms in one login — with an AI agent driving your career",
    subtitle:
      "Stop paying six SaaS bills. Stop logging into six dashboards. Stop training six AIs on your data. Run everything from one OS and let ARIA do the boring parts.",
    excerpt:
      "What you'd otherwise pay Patreon, Kajabi, Eventbrite, Linktree, Twitch, and Discord to do — UPLY does in one product, for one fee, with one AI agent watching the whole thing.",
    author: "The UPLY Desk",
    date: "2026-06-29",
    readMinutes: 8,
    cover: portraitAsset.url,
    tags: ["platform", "ai", "aria", "stack"],
    sections: [
      {
        paragraphs: [
          "Count the tabs open in your creator's browser right now. Patreon for the subscription tier. Kajabi for the course. Eventbrite for the tour. Linktree for the bio. Twitch for the stream. Discord for the community. Stripe for the payouts. Loom for the explainer videos. Calendly for the office hours. Notion for the CRM. ConvertKit for the newsletter.",
          "Each one wants a monthly fee. Each one takes a slice of every sale. None of them talk to each other. None of them know what the others know about your audience. And none of them are building an AI on top of your unified data — because they don't have your unified data.",
        ],
      },
      {
        heading: "The six platforms UPLY replaces",
        list: [
          "Patreon → Communities, paid memberships, free trials, broadcast channels.",
          "Kajabi / Skool → Classroom with modules, progress, gating, payouts.",
          "Eventbrite / Ticketmaster → Tiered ticketing, PPV, QR check-in, resale.",
          "Linktree / Beacons → Pages, link-in-bio, full custom-domain artist sites.",
          "Twitch / Kick → Live streaming, simulcast, multi-cam, watch parties, live shopping.",
          "Discord / Geneva → Group chats, paid 1:1 DMs, event rooms, member referrals.",
        ],
      },
      {
        pullquote:
          "One login. One payout. One audience graph. One AI looking at all of it on your behalf.",
      },
      {
        heading: "Then there's ARIA",
        paragraphs: [
          "ARIA is the autonomous Claude-powered agent that lives inside UPLY. Because every surface you run lives in the same data layer, ARIA can see things no single-tool AI can:",
        ],
        list: [
          "It reads your ticket sales, your stream watch time, your course completion rate, and your community DMs together.",
          "It writes your weekly report and tells you the single best move for next week — usually the move you would have missed.",
          "It prices your next event using actual demand signals from your community, not vibes.",
          "It drafts SEO copy, social captions, and email subject lines tuned to your audience's actual conversion behavior.",
          "It flags fraud, refund risk, and dispute patterns before they hit your Stripe balance.",
          "It plans your tour by clustering your highest-LTV listeners into routable city blocks.",
        ],
      },
      {
        heading: "Why this is impossible on the legacy stack",
        paragraphs: [
          "An AI agent is only as smart as the data it can see. The reason none of the other tools can build something this useful is structural — Patreon doesn't know about your Eventbrite sales, Linktree doesn't know about your Twitch chat, Kajabi doesn't know what your fans buy on tour.",
          "When the data sits in one platform, the agent sees the whole picture. When the agent sees the whole picture, the suggestions stop being generic and start being career-defining.",
        ],
      },
      {
        paragraphs: [
          "Stop subsidizing six companies that don't talk to each other. Bring your audience home. Let the AI work the night shift.",
        ],
      },
    ],
  },
];

export function getUplyBlogPost(slug: string): UplyBlogPost | undefined {
  return UPLY_BLOG_POSTS.find((p) => p.slug === slug);
}
