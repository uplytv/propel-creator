import { createClient } from "@supabase/supabase-js";
import { findArtistBySlug, type ArtistRosterEntry } from "../src/data/artistRoster";
import { getComparison } from "../src/data/comparisons";

const SITE_ORIGIN = "https://uply.tv";
// Env only (security batch 1): no hardcoded key fallback.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";

// Site-wide defaults — every unknown path previews as UPLY.
const DEFAULT_TITLE = "UPLY — The Creator Operating System";
const DEFAULT_DESCRIPTION = "Stream, teach, sell, and build community. Keep 95% of everything you earn.";
// Owner directive: the default preview image is the original UPLY logo
// (square 1024x1024) until per-creator previews go live on real hosting.
const DEFAULT_IMAGE = `${SITE_ORIGIN}/logo.png`;

// Arya XO's tags apply ONLY to his own alias routes (see ARYAXO_PROFILE_ALIASES
// and the arya-* route regexes below) — never as a site-wide default.
const ARYAXO_IMAGE = `${SITE_ORIGIN}/og/ariaxo.jpg`;
const ARYAXO_DESCRIPTION = "150 Bands — out now.";

// Images we know are exactly 1200x630 (safe to advertise dimensions for).
// The square logo default is deliberately NOT here — wrong dims break previews.
const KNOWN_WIDE_IMAGES = new Set([ARYAXO_IMAGE]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ARYAXO_PROFILE_ALIASES = new Set([
  "ariaxo",
  "aryaxo",
  "arya",
  "arya-xo",
  "arya-xo-site",
  "arya-xo-links",
]);

const RESERVED_SINGLE_SEGMENTS = new Set([
  "admin",
  "ads",
  "ad-integrations",
  "affiliates",
  "analytics",
  "apply",
  "aria",
  "aria-command",
  "arya",
  "aryaxo",
  "arya-xo",
  "arya-xo-links",
  "arya-xo-site",
  "auth",
  "blog",
  "boost-cancel",
  "boost-success",
  "buy",
  "buy-credits",
  "c",
  "camera",
  "collaborate",
  "community",
  "content-library",
  "create",
  "create-event",
  "creator",
  "creator-affiliate",
  "dashboard",
  "developer",
  "discover",
  "distribution",
  "embed",
  "event",
  "events",
  "following",
  "for-you",
  "founders",
  "founding-offer",
  "go-live",
  "grow",
  "growth-reports",
  "health",
  "inbox",
  "invite-codes",
  "jobs",
  "job-messages",
  "launchpad",
  "link",
  "live",
  "marketplace",
  "messages",
  "music",
  "my-page",
  "my-rep",
  "network",
  "new",
  "newsletter",
  "notifications",
  "onboarding",
  "playlist",
  "playlists",
  "podcast",
  "podcast-rss",
  "presave",
  "pricing",
  "privacy",
  "products",
  "radiate",
  "repurpose",
  "reset-password",
  "roster",
  "scan",
  "search",
  "settings",
  "shop",
  "shorts",
  "smart-links",
  "social",
  "stream",
  "talent-profile",
  "terms",
  "tickets",
  "trending",
  "tv",
  "unsubscribe",
  "upgrade",
  "vs",
  "wallet",
  "waitlist",
]);

type Meta = {
  title: string;
  description: string;
  image: string;
  url: string;
};

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default {
  async fetch(request: Request) {
    const originalUrl = getOriginalUrl(request);
    const canonicalUrl = `${SITE_ORIGIN}${originalUrl.pathname}${originalUrl.search}`;
    const path = normalizePath(originalUrl.pathname);

    const meta = await resolveMeta(path, canonicalUrl);

    console.log("[api/og] resolved", {
      pathname: path,
      title: meta.title,
      image: meta.image,
    });

    return new Response(request.method === "HEAD" ? null : renderMetaHtml(meta), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate",
        "X-Robots-Tag": "all",
      },
    });
  },
};

/**
 * Resolution order (first hit wins):
 *  1. Arya XO alias routes (his pages ONLY)
 *  2. Static marketing routes (/, /pricing, /discover, /founding-offer, /vs/:slug, …)
 *  3. Roster artist routes (/:slug-site, /:slug/blog[/:post], /:slug/community, /:slug/courses[/:course])
 *  4. /community/:creatorId[/tab] → creator_spaces lookup
 *  5. /@handle, /:username, /creator/:username → roster + profiles lookup
 *  6. UPLY defaults
 */
async function resolveMeta(path: string, canonicalUrl: string): Promise<Meta> {
  const aryaMeta = getAryaRouteMeta(path, canonicalUrl);
  if (aryaMeta) return aryaMeta;

  const staticMeta = getStaticRouteMeta(path, canonicalUrl);
  if (staticMeta) return staticMeta;

  const rosterMeta = getRosterRouteMeta(path, canonicalUrl);
  if (rosterMeta) return rosterMeta;

  const communityMeta = await getCommunityMeta(path, canonicalUrl);
  if (communityMeta) return communityMeta;

  const creatorSlug = getCreatorSlug(path);
  if (creatorSlug) {
    const creatorMeta = await getCreatorMeta(creatorSlug.slug, canonicalUrl, creatorSlug.preferRoster);
    if (creatorMeta) return creatorMeta;
  }

  return getDefaultMeta(canonicalUrl, path);
}

function getOriginalUrl(request: Request) {
  const requestUrl = new URL(request.url);
  const pathParam = requestUrl.searchParams.get("path");
  const headerPath = request.headers.get("x-og-original-path");
  const headerUrl = request.headers.get("x-og-original-url");
  const raw = pathParam || headerPath || headerUrl || "/";

  try {
    return raw.startsWith("http://") || raw.startsWith("https://")
      ? new URL(raw)
      : new URL(raw.startsWith("/") ? raw : `/${raw}`, SITE_ORIGIN);
  } catch {
    return new URL("/", SITE_ORIGIN);
  }
}

function normalizePath(pathname: string) {
  const path = pathname.replace(/\/+$/, "");
  return path || "/";
}

/** Arya XO keeps HIS tags on HIS routes only. */
function getAryaRouteMeta(path: string, canonicalUrl: string): Meta | null {
  const isLinks = /^\/(arya-xo-links|(arya|aryaxo|arya-xo)\/links)$/i.test(path);
  const isSite = /^\/(arya|aryaxo|arya-xo|arya-xo-site)$/i.test(path);
  if (isLinks) {
    return {
      title: "Arya XO — Official Links",
      description: "All of Arya XO's official links in one place.",
      image: ARYAXO_IMAGE,
      url: canonicalUrl,
    };
  }
  if (isSite) {
    return {
      title: "Arya XO — Official Website | Inquiries & Bookings",
      description: "Arya XO — official website. For inquiries and bookings.",
      image: ARYAXO_IMAGE,
      url: canonicalUrl,
    };
  }
  return null;
}

function getStaticRouteMeta(path: string, canonicalUrl: string): Meta | null {
  if (path === "/") return getDefaultMeta(canonicalUrl, path);

  // /vs/:slug — SEO comparison pages ("UPLY vs <Name>").
  const vsMatch = path.match(/^\/vs\/([^/]+)$/i);
  if (vsMatch) {
    const comparison = getComparison(vsMatch[1]);
    if (comparison) {
      return {
        title: `UPLY vs ${comparison.competitorName} (2026) — Which is right for creators?`,
        description: cleanText(firstLine(comparison.heroSummary), 200) || DEFAULT_DESCRIPTION,
        image: DEFAULT_IMAGE,
        url: canonicalUrl,
      };
    }
    return getDefaultMeta(canonicalUrl, path);
  }

  const staticMeta: Record<string, Pick<Meta, "title" | "description">> = {
    "/pricing": {
      title: "UPLY Pricing — Keep 95% of Everything",
      description: "Simple creator plans for streaming, selling, teaching, and growing your community.",
    },
    "/discover": {
      title: "Discover Creators on UPLY",
      description: "Explore live streams, communities, courses, events, and music from creators who keep 95% of what they earn.",
    },
    "/founding-offer": {
      title: "Founding Creator Offer — 30-Day Free Trial + Done-For-You Setup",
      description: "Become a UPLY founding creator: 30 days free, done-for-you setup, and 95% of everything you earn. Limited founding spots.",
    },
    "/shop": {
      title: "UPLY Shop — Creator Products and Experiences",
      description: "Discover products, drops, tickets, and exclusive experiences from creators on UPLY.",
    },
    "/trending": {
      title: "Trending on UPLY",
      description: "See the creator streams, posts, events, and drops gaining momentum on UPLY.",
    },
    "/new": {
      title: "New Creators on UPLY",
      description: "Discover new creators building communities, selling products, and going live on UPLY.",
    },
    "/music": {
      title: "UPLY Music — Artist Pages, Tracks, and Live Sets",
      description: "Listen to artists, explore tracks, and follow music creators on UPLY.",
    },
    "/blog": {
      title: "UPLY Blog",
      description: "Playbooks, product updates, and creator-economy guides from UPLY.",
    },
    "/roster": {
      title: "UPLY Artist Roster",
      description: "Hand-picked artists managed on UPLY — music, bookings, communities, and courses in one place.",
    },
  };

  const staticPage = staticMeta[path];
  return staticPage ? { ...staticPage, image: DEFAULT_IMAGE, url: canonicalUrl } : null;
}

/** Look up a roster artist by any slug/alias spelling (e.g. "blake-the-great" → blake). */
function findRosterEntry(slugInput: string): ArtistRosterEntry | null {
  for (const candidate of getProfileHandleCandidates(slugInput)) {
    const artist = findArtistBySlug(candidate);
    if (artist) return artist;
  }
  return null;
}

function rosterImage(artist: ArtistRosterEntry) {
  // Arya's portrait constant stays scoped to his own pages.
  if (artist.slug === "arya-xo") return ARYAXO_IMAGE;
  return firstPublicImage(artist.portraitUrl) || DEFAULT_IMAGE;
}

function rosterProfileMeta(artist: ArtistRosterEntry, canonicalUrl: string): Meta {
  return {
    title: cleanText(artist.displayName, 80),
    description: cleanText(firstLine(artist.tagline || artist.bio), 180) || DEFAULT_DESCRIPTION,
    image: rosterImage(artist),
    url: canonicalUrl,
  };
}

/** Roster artist surfaces: /:slug-site, /:slug/blog[/:post], /:slug/community, /:slug/courses[/:course]. */
function getRosterRouteMeta(path: string, canonicalUrl: string): Meta | null {
  const segments = path.split("/").filter(Boolean);

  // /<slug>-site — shared editorial site (findArtistBySlug strips the -site suffix).
  if (segments.length === 1 && /-site$/i.test(segments[0])) {
    const artist = findRosterEntry(segments[0]);
    if (!artist) return null;
    return {
      title: `${cleanText(artist.displayName, 70)} — Official Site`,
      description: cleanText(firstLine(artist.tagline || artist.bio), 180) || DEFAULT_DESCRIPTION,
      image: rosterImage(artist),
      url: canonicalUrl,
    };
  }

  if (segments.length < 2 || segments.length > 3) return null;
  const artist = findRosterEntry(segments[0]);
  if (!artist) return null;
  const section = segments[1].toLowerCase();

  if (section === "blog") {
    const post = segments[2] ? artist.posts?.find((p) => p.slug === segments[2]) : undefined;
    if (post) {
      return {
        title: `${cleanText(post.title, 90)} — ${cleanText(artist.displayName, 40)}`,
        description: cleanText(firstLine(post.excerpt || post.body), 180) || DEFAULT_DESCRIPTION,
        image: firstPublicImage(post.coverUrl) || rosterImage(artist),
        url: canonicalUrl,
      };
    }
    return {
      title: `${cleanText(artist.displayName, 70)} — Blog`,
      description: cleanText(firstLine(artist.tagline || artist.bio), 180) || DEFAULT_DESCRIPTION,
      image: rosterImage(artist),
      url: canonicalUrl,
    };
  }

  if (section === "community" && segments.length === 2 && artist.community) {
    return {
      title: `${cleanText(artist.community.name, 70)} — ${cleanText(artist.displayName, 40)}`,
      description: cleanText(firstLine(artist.community.description), 180) || DEFAULT_DESCRIPTION,
      image: rosterImage(artist),
      url: canonicalUrl,
    };
  }

  if (section === "courses") {
    const course = segments[2] ? artist.courses?.find((c) => c.slug === segments[2]) : undefined;
    if (course) {
      return {
        title: `${cleanText(course.title, 90)} — ${cleanText(artist.displayName, 40)}`,
        description: cleanText(firstLine(course.summary), 180) || DEFAULT_DESCRIPTION,
        image: firstPublicImage(course.coverUrl) || rosterImage(artist),
        url: canonicalUrl,
      };
    }
    return {
      title: `${cleanText(artist.displayName, 70)} — Courses`,
      description: cleanText(firstLine(artist.tagline || artist.bio), 180) || DEFAULT_DESCRIPTION,
      image: rosterImage(artist),
      url: canonicalUrl,
    };
  }

  return null;
}

/** /community/:creatorId[/tab] — creator_spaces name/description/cover, avatar fallbacks. */
async function getCommunityMeta(path: string, canonicalUrl: string): Promise<Meta | null> {
  const match = path.match(/^\/community\/([^/]+)(?:\/[^/]+)?$/);
  if (!match) return null;
  const creatorId = match[1];
  if (!UUID_RE.test(creatorId)) return null;

  const { data: space } = await supabase
    .from("creator_spaces")
    .select("name, description, cover_image_url, avatar_url, creator_id")
    .eq("creator_id", creatorId)
    .maybeSingle();

  let profile: any = null;
  if (!space?.name || !firstPublicImage(space?.cover_image_url, space?.avatar_url)) {
    const { data } = await supabase
      .rpc("get_public_profile_by_user_id", { _user_id: creatorId })
      .maybeSingle();
    profile = data;
  }

  console.log("[api/og] community lookup", {
    pathname: path,
    creatorId,
    foundSpace: Boolean(space),
    foundProfile: Boolean(profile),
  });

  if (!space && !profile) return null;

  const creatorName = cleanText(profile?.display_name || profile?.username || "", 60);
  const title =
    cleanText(space?.name || "", 80) ||
    (creatorName ? `${creatorName}'s Community` : "Community on UPLY");
  const description =
    cleanText(firstLine(space?.description || ""), 180) ||
    (creatorName ? `Join ${creatorName}'s community on UPLY.` : DEFAULT_DESCRIPTION);
  const image =
    firstPublicImage(space?.cover_image_url, space?.avatar_url, profile?.avatar_url) || DEFAULT_IMAGE;

  return { title, description, image, url: canonicalUrl };
}

function getCreatorSlug(path: string): { slug: string; preferRoster: boolean } | null {
  const atProfile = path.match(/^\/@([^/]+)$/);
  if (atProfile?.[1]) return { slug: normalizeProfileSlugInput(atProfile[1]), preferRoster: false };

  const atProfileChild = path.match(/^\/@([^/]+)\/(?:links|page)$/);
  if (atProfileChild?.[1]) return { slug: normalizeProfileSlugInput(atProfileChild[1]), preferRoster: false };

  const segments = path.split("/").filter(Boolean);
  if (segments.length === 2 && segments[0] === "creator") {
    return { slug: normalizeProfileSlugInput(segments[1]), preferRoster: false };
  }

  if (segments.length === 1) {
    const slug = normalizeProfileSlugInput(segments[0]);
    // Roster routes are registered above the /:username catch-all in App.tsx,
    // so for bare slugs the curated roster entry wins over a DB profile.
    if (!RESERVED_SINGLE_SEGMENTS.has(slug.toLowerCase())) return { slug, preferRoster: true };
  }

  if (segments.length === 2 && (segments[1] === "page" || segments[1] === "links")) {
    const slug = normalizeProfileSlugInput(segments[0]);
    if (!RESERVED_SINGLE_SEGMENTS.has(slug.toLowerCase())) return { slug, preferRoster: true };
  }

  return null;
}

async function getCreatorMeta(slug: string, canonicalUrl: string, preferRoster: boolean): Promise<Meta | null> {
  const candidates = getProfileHandleCandidates(slug);
  const isAriaXO = candidates.some((candidate) => ARYAXO_PROFILE_ALIASES.has(candidate.toLowerCase()));
  if (isAriaXO) {
    console.log("[api/og] creator lookup", {
      pathname: new URL(canonicalUrl).pathname,
      username: slug,
      foundCreator: true,
      image: ARYAXO_IMAGE,
    });

    return {
      title: "AriaXO",
      description: ARYAXO_DESCRIPTION,
      image: ARYAXO_IMAGE,
      url: canonicalUrl,
    };
  }

  const rosterArtist = findRosterEntry(slug);
  if (rosterArtist && preferRoster) return rosterProfileMeta(rosterArtist, canonicalUrl);

  let artist: any = null;
  let basic: any = null;

  for (const candidate of candidates) {
    const { data } = await supabase.rpc("get_public_creator_og_profile", { _username: candidate }).maybeSingle();
    if (data) {
      basic = {
        user_id: data.user_id,
        username: data.username,
        display_name: data.display_name,
        avatar_url: data.avatar_url,
        cover_image_url: data.cover_image_url,
        bio: data.bio,
        channel_tagline: data.channel_tagline,
        og_image_url: data.profile_og_image_url,
      };
      artist = {
        user_id: data.user_id,
        vanity_slug: data.vanity_slug,
        tagline: data.tagline,
        artist_bio: data.artist_bio,
        header_image_url: data.header_image_url,
        hero_image_url: data.hero_image_url,
        seo_description: data.seo_description,
        seo_og_image: data.seo_og_image,
        og_image_url: data.artist_og_image_url,
      };
      break;
    }
  }

  const foundCreator = Boolean(basic || artist);
  const displayName = cleanText(basic?.display_name || basic?.username || artist?.vanity_slug || slug, 80);
  const description =
    cleanText(
      firstLine(
        artist?.seo_description || artist?.tagline || basic?.channel_tagline || artist?.artist_bio || basic?.bio || "",
      ),
      180,
    ) || DEFAULT_DESCRIPTION;
  const overrideImage = firstPublicImage(artist?.og_image_url, basic?.og_image_url, artist?.seo_og_image);
  const coverImage = firstPublicImage(artist?.hero_image_url, artist?.header_image_url, basic?.cover_image_url);
  const profileImage = firstPublicImage(basic?.avatar_url);
  const image = overrideImage || coverImage || profileImage || DEFAULT_IMAGE;

  console.log("[api/og] creator lookup", {
    pathname: new URL(canonicalUrl).pathname,
    username: slug,
    foundCreator,
    image,
  });

  if (!foundCreator) {
    // No DB profile — fall back to the curated roster entry if one matches.
    return rosterArtist ? rosterProfileMeta(rosterArtist, canonicalUrl) : null;
  }

  return {
    title: displayName,
    description,
    image,
    url: canonicalUrl,
  };
}

function getDefaultMeta(canonicalUrl: string, _path: string): Meta {
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    image: DEFAULT_IMAGE,
    url: canonicalUrl,
  };
}

function renderMetaHtml(meta: Meta) {
  const targetUrl = new URL(meta.url);
  const targetPath = `${targetUrl.pathname}${targetUrl.search}` || "/";
  // Scripts-safe JSON (escape "<" so "</script>" can never terminate the block).
  const targetPathJs = JSON.stringify(targetPath).replace(/</g, "\\u003c");
  const imageDimensionTags = KNOWN_WIDE_IMAGES.has(meta.image)
    ? [tag("property", "og:image:width", "1200"), tag("property", "og:image:height", "630")]
    : [];

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(meta.title)}</title><link rel="canonical" href="${escapeHtml(meta.url)}">${[
    tag("name", "description", meta.description),
    tag("property", "og:site_name", "UPLY"),
    tag("property", "og:locale", "en_US"),
    tag("property", "og:type", "website"),
    tag("property", "og:title", meta.title),
    tag("property", "og:description", meta.description),
    tag("property", "og:image", meta.image),
    ...imageDimensionTags,
    tag("property", "og:image:alt", meta.title),
    tag("property", "og:url", meta.url),
    // Square logo default renders best as the compact card; real page images
    // (portraits/covers) get the large card.
    tag("name", "twitter:card", meta.image === DEFAULT_IMAGE ? "summary" : "summary_large_image"),
    tag("name", "twitter:site", "@uplytv"),
    tag("name", "twitter:title", meta.title),
    tag("name", "twitter:description", meta.description),
    tag("name", "twitter:image", meta.image),
    tag("name", "twitter:image:alt", meta.title),
  ].join("")}<script>(function(){var t=${targetPathJs};if(location.pathname+location.search!==t)location.replace(t);})()</script></head><body><p><a href="${escapeHtml(targetPath)}">Continue to UPLY</a></p></body></html>`;
}

function tag(kind: "name" | "property", key: string, value: string) {
  return `<meta ${kind}="${escapeHtml(key)}" content="${escapeHtml(value)}">`;
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** First non-empty line — bios/descriptions preview as a single line. */
function firstLine(value?: string | null) {
  const lines = String(value || "").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function cleanText(value: string, maxLength: number) {
  const cleaned = String(value || "").replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function absoluteHttpsUrl(value?: string | null) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  try {
    const publicStorageUrl = toPublicStorageUrl(raw);
    const url = new URL(publicStorageUrl || raw, SITE_ORIGIN);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function firstPublicImage(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const image = absoluteHttpsUrl(value);
    if (image) return image;
  }
  return null;
}

function toPublicStorageUrl(value: string) {
  try {
    if (!value.startsWith("/") && !value.startsWith("http://") && !value.startsWith("https://") && value.includes("/")) {
      return `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/${value.replace(/^\/+/, "")}`;
    }

    const url = value.startsWith("http://") || value.startsWith("https://")
      ? new URL(value)
      : new URL(value, SUPABASE_URL);
    const marker = "/storage/v1/object/";
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;

    const objectPath = url.pathname.slice(index + marker.length);
    if (objectPath.startsWith("public/")) return url.href;
    if (objectPath.startsWith("sign/")) {
      return `${url.origin}${marker}public/${objectPath.slice("sign/".length)}`;
    }
    if (objectPath.startsWith("authenticated/")) {
      return `${url.origin}${marker}public/${objectPath.slice("authenticated/".length)}`;
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeProfileSlugInput(value?: string | null) {
  const raw = value || "";
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  return decoded.replace(/^@+/, "").trim();
}

function getProfileHandleCandidates(value?: string | null) {
  const normalized = normalizeProfileSlugInput(value);
  const compact = normalized.replace(/[\s.-]+/g, "");
  const alphanumeric = normalized.replace(/[^a-zA-Z0-9_]/g, "");
  const dashed = normalized
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return Array.from(new Set([normalized, compact, alphanumeric, dashed].filter(Boolean)));
}
