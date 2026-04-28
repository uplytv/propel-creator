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
    setMeta("property", "og:image:height", "1200");
    setMeta("property", "og:site_name", "Uply");

    // Twitter
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:image", img);
    setMeta("name", "twitter:card", twitterCard);

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
