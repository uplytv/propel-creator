/**
 * Content + asset registry for Anousha Nikjouian's "Defined Real Estate"
 * brand site (uply.tv/anousha and its sub-pages).
 *
 * Every image below is a SWAPPABLE SLOT: replace the import target with her
 * real Instagram / listing photography and nothing else has to change.
 */
import heroDmv from "@/assets/anousha/hero-dmv.jpg";
import portraitSlot from "@/assets/anousha/portrait-slot.jpg";
import aboutInterior from "@/assets/anousha/about-interior.jpg";
import nbChevyChase from "@/assets/anousha/nb-chevy-chase.jpg";
import nbBethesda from "@/assets/anousha/nb-bethesda.jpg";
import nbGeorgetown from "@/assets/anousha/nb-georgetown.jpg";
import nbArlington from "@/assets/anousha/nb-arlington.jpg";
import nbMclean from "@/assets/anousha/nb-mclean.jpg";
import blogWaiting from "@/assets/anousha/blog-waiting.jpg";
import blogHouseHack from "@/assets/anousha/blog-househack.jpg";
import blogFinishes from "@/assets/anousha/blog-finishes.jpg";
import blogRental from "@/assets/anousha/blog-rental.jpg";

export const IMAGES = {
  hero: heroDmv,
  /** Portrait slot — swap for her real headshot when supplied. */
  portrait: portraitSlot,
  about: aboutInterior,
};

/** business_details.id for the seeded `anousha` tenant (lead capture target). */
export const ANOUSHA_BUSINESS_ID = "1f4ba186-e2f5-47a7-adb0-ff276e824d54";

export const BRAND = {
  name: "Anousha Nikjouian",
  wordmark: "Defined Real Estate",
  role: "REALTOR® · Compass, Chevy Chase",
  tagline: "Luxury real estate, defined.",
  markets: "DC · MD · VA",
  instagram: "https://www.instagram.com/anousha.nik",
  instagramHandle: "@anousha.nik",
  disclosure:
    "Anousha Nikjouian, REALTOR® — licensed in DC, MD & VA. Compass, Chevy Chase. Equal Housing Opportunity. Compass is a licensed real estate brokerage. Educational content only — not legal, tax, or financial advice.",
};

export const TRUST = [
  { k: "Compass", v: "Chevy Chase" },
  { k: "10+ Years", v: "In the DMV market" },
  { k: "DC · MD · VA", v: "Triple licensed" },
  { k: "DMV Native", v: "Born and built here" },
  { k: "Investor & Agent", v: "I own what I advise" },
];

export const SERVICES = [
  {
    id: "buy",
    label: "Buy",
    title: "Buy with a strategist",
    copy: "First condo or forever home — we price the neighborhood, structure the offer, and win without overpaying. You'll know exactly what a house costs to own before you fall in love with it.",
    points: ["Pre-approval & grant programs", "Neighborhood-level pricing", "Offers that win without waiving sense"],
    cta: "Start a buyer plan",
  },
  {
    id: "sell",
    label: "Sell",
    title: "Sell for what it's worth",
    copy: "Preparation is the profit. Staging, finish decisions, and pricing strategy tuned to what DMV buyers actually pay for — then a launch that creates competition in the first ten days.",
    points: ["Pre-list valuation & prep plan", "Design-led staging direction", "Launch strategy & negotiation"],
    cta: "Get a home valuation",
  },
  {
    id: "invest",
    label: "Invest",
    title: "Invest like an owner",
    copy: "Nearly 200 luxury rentals managed, plus flips, wholesale deals, Airbnb setups and Section 8 placements. I underwrite your deal the way I underwrite mine — line by line.",
    points: ["Deal analysis & underwriting", "House hacking & small multi-unit", "Rental model fit: LTR / Section 8 / STR"],
    cta: "Analyze a deal with me",
  },
];

export const NEIGHBORHOODS = [
  { name: "Chevy Chase", note: "Colonials, walkable village core", img: nbChevyChase },
  { name: "Bethesda", note: "New-build condos & luxury towers", img: nbBethesda },
  { name: "Georgetown", note: "Historic rowhomes, tight inventory", img: nbGeorgetown },
  { name: "Arlington", note: "Metro-adjacent appreciation", img: nbArlington },
  { name: "McLean", note: "Estate homes & long-hold value", img: nbMclean },
];

/**
 * SAMPLE testimonials — placeholder social proof for the showcase build.
 * Replace with real, attributable client quotes before this page goes live.
 */
export const TESTIMONIALS = [
  {
    quote:
      "We'd been outbid four times before Anousha. She rebuilt our search around what we could actually own, not just afford — and we closed in Petworth thirty days later.",
    who: "Maya",
    where: "Petworth, DC",
  },
  {
    quote:
      "She talked me out of the flashier condo and into a duplex. Two years on, the second unit covers most of my mortgage. That conversation was worth six figures.",
    who: "Daniel",
    where: "Silver Spring, MD",
  },
  {
    quote:
      "Anousha priced our house, told us exactly which three fixes mattered, and ignored the rest. Multiple offers the first weekend, over ask.",
    who: "The Farrells",
    where: "Arlington, VA",
  },
];

export const TIERS = [
  {
    id: "open-house",
    name: "Open House",
    price: 19,
    promise: "Get literate in the market you're about to buy in.",
    features: [
      "Members-only community feed",
      "Weekly DMV market drop",
      "Open Q&A threads",
      "Buyer & renter resource library",
    ],
  },
  {
    id: "investor-circle",
    name: "Investor Circle",
    price: 79,
    featured: true,
    promise: "Everything in Open House — plus the room where deals get pulled apart.",
    features: [
      "Everything in Open House",
      "Monthly live deal-analysis call",
      "Off-market early-look alerts",
      "My underwriting checklists & templates",
      "Full access to The Blueprint classroom",
    ],
  },
  {
    id: "inner-keys",
    name: "Inner Keys",
    price: 249,
    cap: 25,
    promise: "A small table. Direct access. Built for people executing this year.",
    features: [
      "Everything in Investor Circle",
      "Small-group strategy sessions (max 8 per call)",
      "Quarterly 1:1 portfolio review",
      "Direct DM access",
      "First look at deals and vetted vendors",
    ],
  },
];

export const CIRCLE_FAQ = [
  {
    q: "Do I need to already own property?",
    a: "No. Roughly half the room is renters and first-time buyers. Open House exists exactly for the stage before your first purchase.",
  },
  {
    q: "Is this a real estate course or a community?",
    a: "Both, deliberately. The Blueprint is the structured curriculum; Defined Circle is where you bring your actual numbers and get them stress-tested by people doing it in the same three jurisdictions.",
  },
  {
    q: "What if I'm not in the DMV?",
    a: "The frameworks travel — underwriting, screening, and financing work anywhere. The jurisdiction-specific material (DC, Maryland, Virginia licensing and programs) will be less relevant to you.",
  },
  {
    q: "Can I cancel?",
    a: "Any time, from your account. Inner Keys is capped at 25 seats, so a cancelled seat opens to the waitlist.",
  },
  {
    q: "Is this financial advice?",
    a: "No. It's education and market experience. Decisions on financing, taxes, and legal structure belong with your lender, CPA, and attorney.",
  },
];

export const MODULES: Array<{ n: string; title: string; blurb: string; lessons: string[] }> = [
  {
    n: "01",
    title: "Foundations — How the DMV Actually Works",
    blurb: "Three jurisdictions, three rulebooks, one market. Start here or everything after it is guesswork.",
    lessons: [
      "Three jurisdictions, three rulebooks",
      "Reading a neighborhood in 20 minutes",
      "Rates, prices, rents: how they actually interact",
      "Your team — lender, agent, inspector, title",
      "Starting-point audit worksheet",
    ],
  },
  {
    n: "02",
    title: "First Keys — The First-Time Buyer Path",
    blurb: "From credit pull to keys in hand, including the grant programs most buyers never hear about.",
    lessons: [
      "Credit & pre-approval, properly",
      "Grants & programs: DC HPAP, Maryland Mortgage, Virginia options",
      "Wants vs numbers: the honest budget",
      "Touring like a pro",
      "Offers that win",
      "Contract to closing",
      "Five-figure mistakes to avoid",
    ],
  },
  {
    n: "03",
    title: "First Door — Your First Investment",
    blurb: "The jump from homeowner to owner-operator, using the same money you were already going to spend.",
    lessons: [
      "House hacking 101",
      "Condo vs rowhouse vs small multi-unit",
      "Deal analysis, line by line",
      "Financing an investment",
      "What cash flow really means",
      "First-deal case study",
    ],
  },
  {
    n: "04",
    title: "Scale — Rentals That Run Themselves",
    blurb: "Systems from managing nearly 200 units, scaled down to work on your two.",
    lessons: [
      "Long-term vs Section 8 vs Airbnb",
      "Screening tenants legally",
      "Systems from 200 units, scaled to 2",
      "Rental licensing by jurisdiction",
      "Maintenance & reserves",
      "When to hire management",
    ],
  },
  {
    n: "05",
    title: "Flip & Design",
    blurb: "Where renovation dollars turn into resale dollars — and where they quietly disappear.",
    lessons: [
      "Finding the flip",
      "Budgeting the reno",
      "Design choices that move resale",
      "Managing contractors",
      "Sell vs hold",
    ],
  },
  {
    n: "06",
    title: "The Wealth Plan",
    blurb: "Sequencing a decade so each property funds the next one.",
    lessons: [
      "Sequencing ten years",
      "Equity, refis & 1031s (with your CPA)",
      "Protecting it",
      "Write your plan workbook",
    ],
  },
];

export const OUTCOMES = [
  "Read any DMV neighborhood — pricing, rents, and risk — in under an hour",
  "Get pre-approved without torching your credit or your leverage",
  "Underwrite a deal line by line and know your walk-away number",
  "Choose between long-term, Section 8, and short-term for your specific property",
  "Run a rental with systems instead of weekends",
  "Leave with a written ten-year plan, not a vibe",
];

export interface Post {
  slug: string;
  title: string;
  dek: string;
  tag: string;
  date: string;
  readTime: string;
  image: string;
  body: string[];
}

export const POSTS: Post[] = [
  {
    slug: "cost-of-waiting-dmv",
    title: "The Real Cost of Waiting: what \"I'll buy next year\" actually costs in the DMV",
    dek: "Waiting feels free. In a supply-constrained market it is the most expensive decision most buyers make — and it rarely shows up on a spreadsheet.",
    tag: "Buying",
    date: "2026-08-18",
    readTime: "6 min read",
    image: blogWaiting,
    body: [
      "Every spring I have the same conversation. Someone tells me they're going to wait — for rates, for prices, for a bonus, for a better week. Waiting feels like the safe, free option. In the DMV it is usually neither, because the thing people are waiting out is not the thing that's actually moving their cost.",
      "Start with what waiting costs on the way in. A year of renting a two-bedroom in Arlington or Petworth is real money that buys you nothing you keep. Meanwhile the equity you would have built — principal paid down plus whatever the property does — accrues to a different owner. Even in a flat year, the gap between renting and owning the same square footage is rarely zero; it is simply invisible, because nobody sends you a monthly statement for the wealth you didn't build.",
      "Then look at what the market does while you wait. Washington's supply problem is structural, not cyclical. Zoning, historic districts, and land constraints in the core mean the DMV does not add inventory quickly when demand rises, and the region's employment base — federal, contracting, health, tech — softens more slowly than most metros. That's the mechanism that keeps well-located DMV housing stubbornly priced even in mediocre years.",
      "The rate argument is the one that deserves the most care, because it's the one that sounds smartest. Rates move payment, not price, and the two move in opposite directions. High rates suppress competition: fewer bidders, more contingencies survive, more sellers negotiate. When rates fall, the buyers who were waiting all arrive at once, and the discount you were waiting for gets bid away. You can refinance a rate. You cannot refinance the price you paid, and you cannot refinance the offer you never made.",
      "None of this means buy now regardless. There are good reasons to wait: an unstable job, debt that needs clearing first, a down payment three months from being whole, a move you're not sure about. Those are plans. \"Next year\" without a number attached is not a plan — it's a deferral, and deferrals renew themselves annually.",
      "So make it concrete. Write down the price you'd need, the payment you can carry, the reserve you want in the bank, and the date those three are true. If that date is real, waiting is strategy. If you can't write it, you're not waiting — you're just not deciding, and in this market that has a price too.",
    ],
  },
  {
    slug: "house-hacking-dc-md-va",
    title: "House hacking in three jurisdictions: how DC, Maryland and Virginia differ",
    dek: "Same strategy, three rulebooks. What changes across the DMV line — licensing, tenant law, financing, and the numbers that follow.",
    tag: "Investing",
    date: "2026-08-11",
    readTime: "7 min read",
    image: blogHouseHack,
    body: [
      "House hacking — buying a two-to-four unit property, living in one unit and renting the rest — is still the cleanest entry into ownership in this region, because it lets you use owner-occupant financing on what is functionally an investment. Low down payment, primary-residence rate, tenants covering a chunk of the note. The strategy is identical across the DMV. The rules are not, and the rules decide whether the deal works.",
      "In the District, the tenant-protection framework is the strictest of the three. Rental housing requires a Basic Business License and registration; many buildings fall under rent-stabilization rules; and TOPA gives tenants a right of first refusal when a property with existing tenants is sold, which can add months and negotiation to a purchase. Practical consequence: in DC, buy vacant if you possibly can, and underwrite legal and vacancy time honestly. The upside is that DC rents per square foot in walkable neighborhoods are the strongest in the region, and demand almost never fully softens.",
      "Maryland is the middle path and, for most first house hacks I underwrite, the easiest place to make the numbers work. Licensing is county-by-county — Montgomery and Prince George's each have their own rental licensing, inspection cadence, and, in Montgomery's case, rent-stabilization rules you must check before you write an offer. Older Silver Spring, Takoma Park, and Hyattsville stock includes genuine small multi-unit buildings at prices that still pencil, and Section 8 participation is well-established with reliable payment.",
      "Virginia is the most landlord-flexible of the three, governed largely by the Virginia Residential Landlord and Tenant Act, with faster remedies and lighter local licensing. That flexibility is priced in: Arlington and Alexandria entry prices are high relative to achievable rents, so cash flow on day one is often thin and the case rests on appreciation plus principal paydown. Further out — parts of Fairfax, Prince William — the math turns, and so does the tenant profile.",
      "Three numbers decide the deal in any of the three: total monthly cost (payment, taxes, insurance, HOA, reserves), realistic rent for the units you'll actually let, and time-to-legal — how long from closing until you may lawfully collect that rent. That last one is the number nobody models, and it's the one that kills first deals. In DC it can be months. In Virginia it can be weeks.",
      "Run all three jurisdictions on the same spreadsheet before you fall in love with a block. Most people are surprised by which one wins — and it's rarely the one they started their search in.",
    ],
  },
  {
    slug: "five-finishes-flippers-get-wrong",
    title: "Five finishes flippers get wrong — and buyers pay for",
    dek: "Renovation dollars are not equal. After enough flips you learn which finishes buyers pay a premium for and which quietly cost you the offer.",
    tag: "Renovation",
    date: "2026-08-04",
    readTime: "6 min read",
    image: blogFinishes,
    body: [
      "A flip budget is a series of bets on what a buyer will notice. Most losing flips aren't under-renovated — they're renovated in the wrong order, with money spent where nobody looks and saved where everybody does. Five patterns come up again and again in DMV resales.",
      "One: trend-chasing cabinetry. Bold color and heavy-grain finishes photograph well and date within two years. A buyer in Bethesda paying near the top of the comp range wants to feel the kitchen will still look current at resale. Neutral, well-built doors with quality hardware read expensive for longer and never lose you an offer. Save the personality for a light fixture you can change.",
      "Two: mismatched finish tiers. Quartz counters next to builder-grade hollow-core doors and plastic switch plates tells a buyer the renovation was cosmetic — and once they believe that, they start looking for what else was skipped. Consistency across a tier beats one showpiece surrounded by shortcuts. If the budget is thin, drop the whole kitchen a tier rather than mixing.",
      "Three: flooring that changes at every doorway. Nothing shrinks a rowhouse like three flooring materials on one level. Continuous flooring through the main floor is one of the highest-return line items in a DMV flip, especially in narrow floor plans where visual continuity does the work of square footage.",
      "Four: ignoring the invisible systems. Panel, HVAC age, water heater, sewer line. Buyers don't pay a premium for a new panel — but their inspector will find the old one, and the repair credit they ask for will exceed what you'd have spent doing it up front. Worse, systems findings reopen a negotiation you had already won.",
      "Five: bathroom niches, missing storage, and no laundry logic. The three things buyers narrate out loud on a tour are where clothes go, where coats go, and where laundry lives. A well-placed closet or a properly located stack unit moves offers more than a marble accent wall.",
      "The discipline behind all five: spend where the buyer's eye lands first and where the inspector's flashlight goes, in that order. Everything else is decoration you're paying for and they aren't.",
    ],
  },
  {
    slug: "section-8-airbnb-or-long-term",
    title: "Section 8, Airbnb, or long-term: choosing the rental model for your first property",
    dek: "The same house produces three different businesses. Pick the model that fits your property, your jurisdiction, and — honestly — your temperament.",
    tag: "Rentals",
    date: "2026-07-28",
    readTime: "7 min read",
    image: blogRental,
    body: [
      "New investors ask which rental model makes the most money. Wrong question. Each model is a different business with a different workload, and the right answer depends on three things: what the property is, where it sits, and how much operational involvement you actually want.",
      "Long-term rental is the baseline. One lease a year, predictable rent, the lowest management burden, and the financing and insurance everyone understands. Returns are modest but durable, and vacancy is the main risk. If this is your first property and you have a full-time job, this is usually the correct answer — you learn the operations of ownership on easy mode before you add complexity.",
      "Section 8 — the Housing Choice Voucher program — is the most misunderstood of the three. A housing authority pays a large share of the rent directly and on time, tenants tend to stay for years, and in parts of Prince George's County and east-of-the-river DC the payment standard can exceed achievable market rent for the same unit. In exchange you accept inspection standards, an initial approval timeline that delays your first check, and paperwork. Note that DC, Maryland, and Virginia jurisdictions have source-of-income protections — in most of the DMV you cannot refuse a voucher holder for having a voucher, so understand the program whether or not you plan to court it.",
      "Short-term rental is a hospitality business wearing a real estate costume. Gross revenue can be double a long-term lease in the right location, and so can the work: turnovers, cleaners, messaging, dynamic pricing, furnishing capital, and platform dependency. Regulation is the deciding factor. DC restricts short-term rentals to your primary residence with registration and a hard cap on un-hosted nights; Virginia and Maryland jurisdictions vary widely by county and city, and HOAs and condo boards routinely prohibit them outright. Check the rulebook before the spreadsheet.",
      "Match the model to the asset. Basement unit with a separate entrance near a hospital or university: long-term or mid-term furnished. Solid three-bedroom in a voucher-strong submarket: Section 8 is worth modeling seriously. Walkable, characterful unit in a jurisdiction that permits it, and you enjoy hospitality: short-term can work — with the reserve to survive a slow quarter.",
      "Then be honest about temperament. The best return on paper you abandon in month four is worse than the boring one you actually run for a decade. Your first property should teach you the job. You can always change the model once you know what the job feels like.",
    ],
  },
];

export const LINKS = [
  { label: "Work With Me", sub: "Buy, sell, or invest in the DMV", to: "/anousha#work", primary: true },
  { label: "Join Defined Circle", sub: "Community from $19/mo", to: "/anousha/circle" },
  { label: "The Blueprint", sub: "6 modules · 33 lessons", to: "/anousha/blueprint" },
  { label: "Free Home Valuation", sub: "What is your home worth today?", to: "/anousha#work?intent=sell" },
  { label: "The Journal", sub: "Notes on the DMV market", to: "/anousha/blog" },
  { label: "Instagram", sub: BRAND.instagramHandle, href: BRAND.instagram },
];
