/**
 * Shared stream-category taxonomy.
 *
 * STREAM_CATEGORIES mirrors the inline `categories` list in src/pages/GoLive.tsx
 * (the list a creator picks from when going live). GoLive.tsx is intentionally
 * left untouched for now — it recently landed and is read-only for this change.
 * TODO(dedup): point GoLive.tsx at this module so the taxonomy lives in one place.
 *
 * CATEGORY_BUCKETS groups the taxonomy into 8 display buckets for discovery
 * surfaces (Live Hub category tiles). Every taxonomy entry maps to exactly one
 * bucket, so "N live" counts are real instead of substring-guess misses.
 */

export const STREAM_CATEGORIES = [
  "Business Strategy", "Entrepreneurship", "Personal Finance", "Investing & Trading",
  "Real Estate", "E-Commerce", "Dropshipping", "Amazon FBA", "Fitness & Nutrition",
  "Weight Loss", "Bodybuilding", "Mental Health & Wellness", "Relationships & Dating",
  "Parenting", "Spirituality & Mindset", "Music Production", "DJing", "Podcasting",
  "Content Creation", "Photography", "Videography", "Graphic Design", "UX Design",
  "Web Development", "AI & Tech", "Cybersecurity", "Gaming", "Marketing", "Copywriting",
  "Sales", "Public Speaking", "Writing", "Education & Tutoring", "Language Learning",
  "Career & Productivity", "Legal & Compliance", "Fashion & Style", "Food & Cooking",
  "Travel", "NFTs & Crypto", "Faith & Community",
] as const;

export type StreamCategory = (typeof STREAM_CATEGORIES)[number];

export interface CategoryBucket {
  name: string;
  emoji: string;
  gradient: string;
  /** Exact taxonomy entries that roll up into this bucket. */
  categories: readonly string[];
}

export const CATEGORY_BUCKETS: readonly CategoryBucket[] = [
  {
    name: "Business & Money",
    emoji: "💰",
    gradient: "from-amber-500/20 to-yellow-500/10",
    categories: [
      "Business Strategy", "Entrepreneurship", "Personal Finance", "Investing & Trading",
      "Real Estate", "E-Commerce", "Dropshipping", "Amazon FBA", "NFTs & Crypto",
    ],
  },
  {
    name: "Marketing & Sales",
    emoji: "📣",
    gradient: "from-sky-500/20 to-blue-500/10",
    categories: ["Marketing", "Copywriting", "Sales", "Public Speaking"],
  },
  {
    name: "Health & Fitness",
    emoji: "💪",
    gradient: "from-emerald-500/20 to-teal-500/10",
    categories: ["Fitness & Nutrition", "Weight Loss", "Bodybuilding", "Mental Health & Wellness"],
  },
  {
    name: "Life & Mindset",
    emoji: "🧠",
    gradient: "from-violet-500/20 to-purple-500/10",
    categories: ["Relationships & Dating", "Parenting", "Spirituality & Mindset", "Faith & Community"],
  },
  {
    name: "Music & Audio",
    emoji: "🎵",
    gradient: "from-rose-500/20 to-pink-500/10",
    categories: ["Music Production", "DJing", "Podcasting"],
  },
  {
    name: "Creative & Design",
    emoji: "🎨",
    gradient: "from-fuchsia-500/20 to-pink-500/10",
    categories: [
      "Content Creation", "Photography", "Videography", "Graphic Design",
      "UX Design", "Writing", "Fashion & Style",
    ],
  },
  {
    name: "Tech & Gaming",
    emoji: "💻",
    gradient: "from-indigo-500/20 to-blue-500/10",
    categories: ["Web Development", "AI & Tech", "Cybersecurity", "Gaming"],
  },
  {
    name: "Learning & Lifestyle",
    emoji: "📚",
    gradient: "from-green-500/20 to-emerald-500/10",
    categories: [
      "Education & Tutoring", "Language Learning", "Career & Productivity",
      "Legal & Compliance", "Food & Cooking", "Travel",
    ],
  },
] as const;

// Exact (case-insensitive) taxonomy → bucket lookup.
const exactLookup = new Map<string, CategoryBucket>();
for (const bucket of CATEGORY_BUCKETS) {
  for (const cat of bucket.categories) exactLookup.set(cat.toLowerCase(), bucket);
}

/**
 * Resolve a stream's raw category string to its display bucket.
 * Exact taxonomy matches first; falls back to a lenient contains-match in both
 * directions so legacy / free-text values ("Fitness", "Gaming IRL", …) still land
 * in a sensible bucket. Returns null when nothing plausibly matches.
 */
export function bucketForCategory(raw: string | null | undefined): CategoryBucket | null {
  if (!raw) return null;
  const c = raw.trim().toLowerCase();
  if (!c) return null;

  const exact = exactLookup.get(c);
  if (exact) return exact;

  for (const bucket of CATEGORY_BUCKETS) {
    for (const cat of bucket.categories) {
      const cl = cat.toLowerCase();
      if (cl.includes(c) || c.includes(cl)) return bucket;
    }
  }
  return null;
}

/** Count items per bucket name from a list of raw category strings. */
export function countByBucket(rawCategories: Array<string | null | undefined>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const raw of rawCategories) {
    const bucket = bucketForCategory(raw);
    if (bucket) counts[bucket.name] = (counts[bucket.name] || 0) + 1;
  }
  return counts;
}
