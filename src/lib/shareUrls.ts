import { getSiteUrl } from "./siteUrl";

export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

/**
 * Build a shareable URL with UTM parameters for attribution tracking.
 * Always uses the canonical production URL (never preview URLs).
 */
export function buildShareUrl(path: string, utm: UtmParams): string {
  const base = getSiteUrl();
  // Ensure path starts with /
  const safePath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(safePath, base);

  if (utm.source) url.searchParams.set("utm_source", utm.source);
  if (utm.medium) url.searchParams.set("utm_medium", utm.medium);
  if (utm.campaign) url.searchParams.set("utm_campaign", utm.campaign);
  if (utm.content) url.searchParams.set("utm_content", utm.content);
  if (utm.term) url.searchParams.set("utm_term", utm.term);

  return url.toString();
}

/** Convenience for profile shares */
export function buildProfileShareUrl(slug: string, medium = "social"): string {
  return buildShareUrl(`/@${slug}`, {
    source: "profile",
    medium,
    campaign: slug,
  });
}

/** Convenience for track shares */
export function buildTrackShareUrl(trackId: string, medium = "social"): string {
  return buildShareUrl(`/music/track/${trackId}`, {
    source: "track",
    medium,
    campaign: trackId,
  });
}

/** Convenience for stream shares */
export function buildStreamShareUrl(streamId: string, medium = "social"): string {
  return buildShareUrl(`/stream/${streamId}`, {
    source: "stream",
    medium,
    campaign: streamId,
  });
}
