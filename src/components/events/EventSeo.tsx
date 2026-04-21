import { useEffect } from "react";
import type { GlobalEvent } from "./GlobalEventCard";

// Lightweight SEO updater: sets <title>, meta description, OG tags, canonical, and Event JSON-LD
export function EventSeo({ event }: { event: GlobalEvent }) {
  useEffect(() => {
    const title = `${event.title}${event.city ? ` · ${event.city}` : ""} | UPLY`;
    const desc = `${event.title}${event.artist_name ? ` featuring ${event.artist_name}` : ""}${event.venue ? ` at ${event.venue}` : ""}${event.city ? `, ${event.city}` : ""}. Watch UPLY creators streaming live from this event.`.slice(0, 160);

    document.title = title;

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        const [k, v] = selector.replace(/[\[\]"']/g, "").split("=");
        el.setAttribute(k, v);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', "content", desc);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:type"]', "content", "event");
    if (event.image_url) setMeta('meta[property="og:image"]', "content", event.image_url);
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");

    // Canonical
    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = `${window.location.origin}/events/global/${event.id}`;

    // JSON-LD Event schema
    const ld = {
      "@context": "https://schema.org",
      "@type": "Event",
      name: event.title,
      startDate: event.date,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
      location: event.venue ? {
        "@type": "Place",
        name: event.venue,
        address: [event.city, event.country].filter(Boolean).join(", "),
      } : undefined,
      image: event.image_url ? [event.image_url] : undefined,
      performer: event.artist_name ? { "@type": "PerformingGroup", name: event.artist_name } : undefined,
      offers: event.ticket_url ? {
        "@type": "Offer",
        url: event.ticket_url,
        availability: "https://schema.org/InStock",
      } : undefined,
    };

    let script = document.head.querySelector('script[data-seo="event-jsonld"]') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo", "event-jsonld");
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(ld);

    return () => {
      // Reset title on unmount
      document.title = "UPLY";
    };
  }, [event]);

  return null;
}
