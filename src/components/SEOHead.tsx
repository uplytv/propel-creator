import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface SEOHeadProps {
  title?: string;
  description?: string;
  type?: string;
  image?: string;
  twitterCard?: string;
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
}: SEOHeadProps) {
  const { pathname } = useLocation();
  const fullTitle = title ? `${title} | UPLY` : DEFAULT_TITLE;
  const desc = description || DEFAULT_DESCRIPTION;
  const img = image || DEFAULT_IMAGE;
  const canonical = `${BASE_URL}${pathname === "/" ? "" : pathname}`;

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
    setMeta("property", "og:site_name", "UPLY");

    // Twitter
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:image", img);
    setMeta("name", "twitter:card", twitterCard);
  }, [fullTitle, desc, img, canonical, type]);

  return null;
}
