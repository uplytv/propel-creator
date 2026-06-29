import { createClient } from "@supabase/supabase-js";

const SITE_ORIGIN = "https://uply.tv";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://dbjlhmbgskvhuzqvqfrl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiamxobWJnc2t2aHV6cXZxZnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1OTM1NzUsImV4cCI6MjA4ODE2OTU3NX0.hmFhgwZNpA3a8-ewpuupIChPbY1ykvx8XOvD7qyr66Q";

const DEFAULT_TITLE = "UPLY — The Creator Operating System";
const DEFAULT_DESCRIPTION = "Stream, teach, sell, and build community. Keep 95% of everything you earn.";
const DEFAULT_IMAGE = `${SITE_ORIGIN}/uply-og-default.png`;
const ARYAXO_IMAGE = `${SITE_ORIGIN}/og/ariaxo.jpg`;
const ARYAXO_DESCRIPTION = "Listen to 150 Bands by HUGEL, YoungBoy Never Broke Again, and AriaXO.";

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
  "boost-cancel",
  "boost-success",
  "buy",
  "buy-credits",
  "c",
  "camera",
  "collaborate",
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

    const routeMeta = getRouteMeta(path, canonicalUrl);
    const creatorSlug = routeMeta ? null : getCreatorSlug(path);
    const creatorMeta = creatorSlug ? await getCreatorMeta(creatorSlug, canonicalUrl) : null;
    const meta = creatorMeta || routeMeta || getDefaultMeta(canonicalUrl, path);

    console.log("[api/og] resolved", {
      pathname: path,
      username: creatorSlug,
      foundCreator: Boolean(creatorMeta),
      image: meta.image,
    });

    return new Response(request.method === "HEAD" ? null : renderMetaHtml(meta), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate",
        "X-Robots-Tag": "all",
      },
    });
  },
};

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

function getRouteMeta(path: string, canonicalUrl: string): Meta | null {
  const aryaRoute = /^\/(arya|aryaxo|arya-xo)(\/links)?$|^\/(arya-xo-site|arya-xo-links)$/i.test(path);
  if (aryaRoute) {
    return {
      title: "AriaXO",
      description: ARYAXO_DESCRIPTION,
      image: ARYAXO_IMAGE,
      url: canonicalUrl,
    };
  }

  if (path === "/") return getDefaultMeta(canonicalUrl, path);

  const staticMeta: Record<string, Pick<Meta, "title" | "description">> = {
    "/pricing": {
      title: "UPLY Pricing — Keep 95% of Everything",
      description: "Simple creator plans for streaming, selling, teaching, and growing your community.",
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
  };

  const staticPage = staticMeta[path];
  return staticPage ? { ...staticPage, image: DEFAULT_IMAGE, url: canonicalUrl } : null;
}

function getCreatorSlug(path: string) {
  const atProfile = path.match(/^\/@([^/]+)$/);
  if (atProfile?.[1]) return normalizeProfileSlugInput(atProfile[1]);

  const atProfileChild = path.match(/^\/@([^/]+)\/(?:links|page)$/);
  if (atProfileChild?.[1]) return normalizeProfileSlugInput(atProfileChild[1]);

  const segments = path.split("/").filter(Boolean);
  if (segments.length === 2 && segments[0] === "creator") {
    return normalizeProfileSlugInput(segments[1]);
  }

  if (segments.length === 1) {
    const slug = normalizeProfileSlugInput(segments[0]);
    if (!RESERVED_SINGLE_SEGMENTS.has(slug.toLowerCase())) return slug;
  }

  if (segments.length === 2 && (segments[1] === "page" || segments[1] === "links")) {
    const slug = normalizeProfileSlugInput(segments[0]);
    if (!RESERVED_SINGLE_SEGMENTS.has(slug.toLowerCase())) return slug;
  }

  return null;
}

async function getCreatorMeta(slug: string, canonicalUrl: string): Promise<Meta | null> {
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
  const description = cleanText(
    artist?.seo_description || artist?.tagline || basic?.channel_tagline || artist?.artist_bio || basic?.bio || DEFAULT_DESCRIPTION,
    180,
  );
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

  if (!foundCreator) return null;

  return {
    title: displayName,
    description,
    image,
    url: canonicalUrl,
  };
}

function getDefaultMeta(canonicalUrl: string, path: string): Meta {
  return {
    title: path === "/" ? DEFAULT_TITLE : `${DEFAULT_TITLE}`,
    description: DEFAULT_DESCRIPTION,
    image: DEFAULT_IMAGE,
    url: canonicalUrl,
  };
}

function renderMetaHtml(meta: Meta) {
  return `<!doctype html><html lang="en"><head>${[
    tag("property", "og:title", meta.title),
    tag("property", "og:description", meta.description),
    tag("property", "og:image", meta.image),
    tag("property", "og:image:width", "1200"),
    tag("property", "og:image:height", "630"),
    tag("property", "og:url", meta.url),
    tag("property", "og:type", "website"),
    tag("name", "twitter:card", "summary_large_image"),
    tag("name", "twitter:title", meta.title),
    tag("name", "twitter:description", meta.description),
    tag("name", "twitter:image", meta.image),
  ].join("")}</head><body></body></html>`;
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

