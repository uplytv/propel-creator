/**
 * Curated, hand-picked search results that get injected into the global
 * search hook for high-priority creators / pages that don't live in the DB
 * yet. Right now this powers Arya XO discovery: searching "arya", "aryaxo",
 * "arya xo", "150 bands", "hugel", "youngboy", or "blog" surfaces his
 * artist site, link-in-bio, blog feature, and key tracks.
 */

import portraitAsset from "@/assets/arya-xo-portrait-v3.jpg.asset.json";
import bandsCoverAsset from "@/assets/150bands-cover.jpg.asset.json";

export type CuratedResultType =
  | "artist"
  | "page"
  | "blog"
  | "track"
  | "creator";

export interface CuratedResult {
  id: string;
  type: CuratedResultType;
  title: string;
  subtitle?: string;
  image?: string | null;
  link: string;
  /** Higher = surface earlier */
  weight: number;
  /** Tokens that should match the user's search term */
  keywords: string[];
  /** Show a verified-artist checkmark next to the title */
  verified?: boolean;
  /** Stable key enabling the local follow/unfollow button on the card */
  followKey?: string;
}

const ARYA_KEYWORDS = [
  "arya",
  "aryaxo",
  "arya xo",
  "arya-xo",
  "xo",
  "shahbazy",
  "lit reeezy",
  "litreeezy",
  "iranian rapper",
  "persian rapper",
];

const ARYA_RECORD_KEYWORDS = [
  ...ARYA_KEYWORDS,
  "150 bands",
  "150bands",
  "hugel",
  "youngboy",
  "nba youngboy",
  "twenty one",
  "afro house",
  "latin house",
];

const ARYA_BLOG_KEYWORDS = [
  ...ARYA_RECORD_KEYWORDS,
  "blog",
  "feature",
  "come up",
  "come-up",
  "rhythm desk",
  "story",
  "press",
];

export const CURATED_RESULTS: CuratedResult[] = [
  {
    id: "arya-xo-artist",
    type: "artist",
    title: "Arya XO",
    subtitle: "Verified artist · 263K followers · Las Vegas",
    image: portraitAsset.url,
    link: "/arya-xo-site",
    weight: 100,
    keywords: ARYA_KEYWORDS,
    verified: true,
    followKey: "aryaxo",
  },
  {
    id: "arya-xo-creator",
    type: "creator",
    title: "@aryaxo",
    subtitle: "Official Arya XO profile on UPLY",
    image: portraitAsset.url,
    link: "/arya-xo",
    weight: 95,
    keywords: ARYA_KEYWORDS,
    verified: true,
    followKey: "aryaxo",
  },
  {
    id: "arya-xo-blog",
    type: "blog",
    title: "Twenty-two, and writing his own lane",
    subtitle: "Feature · The Come-Up · 8 min read",
    image: portraitAsset.url,
    link: "/arya-xo/blog",
    weight: 92,
    keywords: ARYA_BLOG_KEYWORDS,
  },
  {
    id: "arya-xo-site-page",
    type: "page",
    title: "Arya XO — Official Website",
    subtitle: "Bookings, press & inquiries",
    image: portraitAsset.url,
    link: "/arya-xo-site",
    weight: 90,
    keywords: [...ARYA_KEYWORDS, "website", "booking", "book", "inquiries"],
  },
  {
    id: "arya-xo-links-page",
    type: "page",
    title: "Arya XO — Official Links",
    subtitle: "All of Arya XO's links in one place",
    image: portraitAsset.url,
    link: "/arya-xo",
    weight: 88,
    keywords: [...ARYA_KEYWORDS, "links", "linktree", "social"],
  },
  {
    id: "arya-xo-150-bands",
    type: "track",
    title: "150 Bands",
    subtitle: "HUGEL × NBA YoungBoy × Arya XO",
    image: bandsCoverAsset.url,
    link: "/arya-xo/blog/150-bands",
    weight: 85,
    keywords: ARYA_RECORD_KEYWORDS,
  },
];

function matches(term: string, keywords: string[]) {
  const t = term.trim().toLowerCase();
  if (t.length < 2) return false;
  return keywords.some((k) => k.includes(t) || t.includes(k));
}

/**
 * Return curated results that should be surfaced for the given search term.
 * Sorted by weight, descending.
 */
export function getCuratedResults(term: string): CuratedResult[] {
  return CURATED_RESULTS.filter((r) => matches(term, r.keywords)).sort(
    (a, b) => b.weight - a.weight,
  );
}
