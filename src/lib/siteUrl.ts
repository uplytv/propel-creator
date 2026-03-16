/** Canonical production URL — used for all shareable links, SEO, and referrals */
export const SITE_URL = "https://propel-creator.lovable.app";

/** Returns the production base URL for shareable links (never the preview URL) */
export function getSiteUrl(): string {
  return SITE_URL;
}
