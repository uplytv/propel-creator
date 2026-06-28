import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface SEOHeadProps {
  title?: string;
  description?: string;
  type?: string;
  image?: string;
  twitterCard?: string;
  /** JSON-LD structured data (single object or array). Injected as <script type="application/ld+json"> */
  jsonLd?: Record<string, any> | Record<string, any>[];
  /** Optional canonical URL override (defaults to current pathname on uply.tv) */
  canonicalUrl?: string;
  /** noindex flag — set true for private/auth-only pages */
  noindex?: boolean;
}

const BASE_URL = "https://uply.tv";
const DEFAULT_TITLE = "Uply";
const DEFAULT_DESCRIPTION = "The Ultimate Creator Network";
const DEFAULT_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/cikFlxVx8jfBrfytYvhbk5DVvYT2/social-images/social-1773093383614-084CEBC0-15D0-4F96-A3BD-D7F3F8441A0D.webp";

export default function SEOHead({
  title,
  description,
  type = "website",
  image,
  twitterCard = "summary_large_image",
  jsonLd,
  canonicalUrl,
  noindex = false,
}: SEOHeadProps) {
  const { pathname } = useLocation();
  const fullTitle = title ? `${title} | Uply` : DEFAULT_TITLE;
  const desc = description || DEFAULT_DESCRIPTION;
  const img = image || DEFAULT_IMAGE;
  const canonical = canonicalUrl || `${BASE_URL}${pathname === "/" ? "" : pathname}`;

  useEffect(() => {
    // Title
    document.title = fullTitle;

    // Helper to set or create a meta tag
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Canonical
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonical);

    // Standard meta
    setMeta("name", "description", desc);

    // Open Graph
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:type", type);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:image", img);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");
    setMeta("property", "og:image:alt", fullTitle);
    setMeta("property", "og:site_name", "UPLY");
    setMeta("property", "og:locale", "en_US");

    // Twitter
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:image", img);
    setMeta("name", "twitter:image:alt", fullTitle);
    setMeta("name", "twitter:card", twitterCard);
    setMeta("name", "twitter:site", "@uplytv");
    setMeta("name", "twitter:creator", "@uplytv");

    // Robots
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");

    // JSON-LD structured data
    const SCRIPT_ID = "seo-jsonld";
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) existing.remove();
    if (jsonLd) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.type = "application/ld+json";
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [fullTitle, desc, img, canonical, type, twitterCard, noindex, jsonLd]);

  return null;
}

/** Helper: Build VideoObject schema for video/clip/recording pages */
export function buildVideoSchema(opts: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration?: number; // seconds
  contentUrl?: string;
  embedUrl?: string;
  creatorName?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: opts.name,
    description: opts.description,
    thumbnailUrl: opts.thumbnailUrl,
    uploadDate: opts.uploadDate,
    ...(opts.duration ? { duration: `PT${Math.floor(opts.duration)}S` } : {}),
    ...(opts.contentUrl ? { contentUrl: opts.contentUrl } : {}),
    ...(opts.embedUrl ? { embedUrl: opts.embedUrl } : {}),
    ...(opts.creatorName
      ? { author: { "@type": "Person", name: opts.creatorName } }
      : {}),
  };
}

/** Helper: BroadcastEvent schema for live streams */
export function buildLiveStreamSchema(opts: {
  name: string;
  description: string;
  thumbnailUrl: string;
  startDate: string;
  endDate?: string;
  isLiveBroadcast?: boolean;
  creatorName?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BroadcastEvent",
    name: opts.name,
    description: opts.description,
    thumbnailUrl: opts.thumbnailUrl,
    startDate: opts.startDate,
    ...(opts.endDate ? { endDate: opts.endDate } : {}),
    isLiveBroadcast: opts.isLiveBroadcast ?? false,
    ...(opts.creatorName
      ? { broadcastOfEvent: { "@type": "Event", performer: opts.creatorName } }
      : {}),
  };
}

/** Helper: Person/ProfilePage schema for creator profiles */
export function buildPersonSchema(opts: {
  name: string;
  url: string;
  image?: string;
  description?: string;
  sameAs?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: opts.name,
    url: opts.url,
    ...(opts.image ? { image: opts.image } : {}),
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.sameAs?.length ? { sameAs: opts.sameAs } : {}),
  };
}

/** Helper: schema.org/Event for ticketed event pages (Google rich results). */
export function buildEventSchema(opts: {
  name: string;
  startDate: string;
  endDate?: string;
  url: string;
  image?: string;
  description?: string;
  status?: string; // event.status
  attendanceMode?: "virtual" | "in_person" | "hybrid";
  venueName?: string;
  venueAddress?: string;
  virtualUrl?: string;
  organizerName?: string;
  price?: number;
  currency?: string;
  soldOut?: boolean;
}) {
  const mode =
    opts.attendanceMode === "in_person" ? "https://schema.org/OfflineEventAttendanceMode"
    : opts.attendanceMode === "hybrid" ? "https://schema.org/MixedEventAttendanceMode"
    : "https://schema.org/OnlineEventAttendanceMode";
  const location =
    opts.attendanceMode === "in_person" || opts.attendanceMode === "hybrid"
      ? { "@type": "Place", name: opts.venueName || "Venue", ...(opts.venueAddress ? { address: opts.venueAddress } : {}) }
      : { "@type": "VirtualLocation", url: opts.virtualUrl || opts.url };
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: opts.name,
    startDate: opts.startDate,
    ...(opts.endDate ? { endDate: opts.endDate } : {}),
    eventStatus: opts.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: mode,
    location,
    url: opts.url,
    ...(opts.image ? { image: [opts.image] } : {}),
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.organizerName ? { organizer: { "@type": "Person", name: opts.organizerName } } : {}),
    offers: {
      "@type": "Offer",
      price: opts.price != null ? opts.price : 0,
      priceCurrency: opts.currency || "USD",
      availability: opts.soldOut ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      url: opts.url,
    },
  };
}
