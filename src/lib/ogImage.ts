/**
 * Build a URL to the dynamic Open Graph image renderer (1200x630 PNG).
 * Backed by the `og-render` Supabase Edge Function. Crawlers fetch this URL;
 * the function returns a brand-styled PNG generated from the query params, so
 * social previews always reflect the latest landing copy.
 */
const OG_RENDER_BASE =
  "https://dbjlhmbgskvhuzqvqfrl.supabase.co/functions/v1/og-render";

export interface OgImageParams {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  cta?: string;
}

export function buildOgImageUrl(params: OgImageParams): string {
  const u = new URL(OG_RENDER_BASE);
  u.searchParams.set("title", params.title);
  if (params.subtitle) u.searchParams.set("subtitle", params.subtitle);
  if (params.eyebrow) u.searchParams.set("eyebrow", params.eyebrow);
  if (params.cta) u.searchParams.set("cta", params.cta);
  // Version stamp lets us bust crawler caches when the renderer changes.
  u.searchParams.set("v", "1");
  return u.toString();
}

/** Canonical landing-page OG image — kept in one place so index.html and
 *  Landing.tsx never drift apart. Update the copy here and both update. */
export const LANDING_OG = {
  title: "The Creator Operating System",
  subtitle: "Stream, teach, sell, and build community. Keep 95% of everything.",
  eyebrow: "UPLY",
  cta: "Join the waitlist",
} satisfies OgImageParams;

export const LANDING_OG_IMAGE_URL = buildOgImageUrl(LANDING_OG);
