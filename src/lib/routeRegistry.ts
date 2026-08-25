/**
 * Route registry — single source of truth for what the React Router tree
 * actually serves. Used by nav components to assert that every tab/link
 * points to a real route in the current user state. Purely additive: no
 * runtime change unless DEV is on (warns) or a caller opts into the
 * `safeNavPath` fallback helper.
 *
 * Keep this list in sync with the <Route> entries in src/App.tsx. The
 * `validateNavPaths` helper will scream in dev if a nav config drifts.
 */

import { matchRoutes, type RouteObject } from "react-router-dom";

// Top-level path patterns mounted in App.tsx. The bare "/:username" catch-all
// is intentionally NOT registered here — nav code should never point at it
// directly; it resolves dynamically per-user via getProfileHandleCandidates.
// Exported so reservedUsernames.ts can derive route-colliding handles from it.
export const KNOWN_PATTERNS: string[] = [
  "/",
  "/index",
  "/auth",
  "/onboarding",
  "/waitlist",
  "/reset-password",
  "/privacy",
  "/terms",
  "/scan",
  "/repurpose",
  "/email-unsubscribe",
  "/unsubscribe",

  // Dashboard & creator suite
  "/dashboard",
  "/dashboard/ai-team",
  "/dashboard/broadcast",
  "/dashboard/content-studio",
  "/dashboard/drip-sequences",
  "/dashboard/email-analytics",
  "/dashboard/subscribers",
  "/analytics",
  "/growth-reports",
  "/grow",
  "/launchpad",
  "/admin",
  "/admin/affiliates",
  "/admin/blake-subscribers",
  "/admin/booking-inquiries",
  "/admin/competition-entries",
  "/admin/event-fees",
  "/admin/features",
  "/admin/payouts",
  "/admin/referrals",
  "/admin/settings",
  "/admin/tv-audit",
  "/admin/users",
  "/staff/reentry-requests",

  // Money
  "/wallet",
  "/buy-credits",
  "/boost-cancel",
  "/boost-success",
  "/affiliates",
  "/creator-affiliate",
  "/pricing",
  "/partners/nexaflow",
  "/nexaflow",
  "/ppv",
  "/upgrade",
  "/ad-integrations",
  "/ads-manager",
  "/crm",
  "/purchases",
  "/ads",

  // Content & creation
  "/content-library",
  "/podcast",
  "/podcast-rss",
  "/events",
  "/events/:slug",
  "/events/create",
  "/events/global/:eventId",
  "/events/:eventId/live",
  "/events/:eventId/watch",
  "/event/rsvp/:eventId",
  "/scan/:eventId",
  "/create-event",
  "/go-live",
  "/live",
  "/stream/:id",
  "/stream/:id/countdown",
  "/camera",
  "/collaborate",
  "/collaborate/product",
  "/create/post/editor",
  "/create/short/editor",
  "/create/story/editor",
  "/create/video/editor",
  "/shorts",
  "/products",
  "/shop",
  "/new",

  // Music (sub-routes are owned by MusicLayout — register the parent)
  // Music (nested children live under /music/* — splat covers album, artist, etc.)
  "/music",
  "/music/*",

  // Discovery & feeds
  "/discover",
  "/for-you",
  "/following",
  "/trending",
  "/network",
  "/search",
  "/c/:category",
  "/tv",
  "/tv/watch/:streamId",

  // Social
  "/social",
  "/social/local",
  "/social/friends",
  "/social/producers",
  "/social/people",

  // Community / Space
  "/community/:creatorId",
  "/community/:creatorId/:tab",
  "/space/:creatorId",
  "/space/:creatorId/:tab",
  "/leaderboard",
  "/achievements",
  "/notifications",
  "/inbox",
  "/messages",
  "/dm",
  "/job-messages",
  "/jobs",
  "/jobs/:id",
  "/post-job",
  "/marketplace",
  "/marketplace/deal/:dealId",
  "/talent-profile",
  "/my-rep",

  // Tickets
  "/tickets",
  "/tickets/:token",
  "/tickets/success",

  // SmartLinks & growth
  "/smart-links",
  "/smart-links/campaign",
  "/smart-links/domains",
  "/smart-links/:id/analytics",
  "/link/:slug",
  "/presave/:slug",
  "/presave/callback",
  "/embed/track/:id",
  "/playlist/:id",
  "/playlists",
  "/distribution",
  "/newsletter",
  "/radiate",
  "/radiate/manage",
  "/radiate/new",

  // Profiles / pages
  "/my-page",
  "/my-page/funnel/:pageId",
  "/p/:slug",
  "/creator/:username",
  "/creator/:username/videos/:id",
  "/creator/:username/events/:slug",
  "/@:slug",
  "/:username/page",
  "/:username/live/:slug",
  "/:username/videos/:slug",
  "/:username/clips/:slug",

  // Misc
  "/settings",
  "/settings/connections",
  "/invite-codes",
  "/invite/:code",
  "/join/:code",
  "/join/:username/:code",
  "/ref/:code",
  "/buy/:token",
  "/aria-command",
  "/aria/growth-assistant",
  "/developer",
];

const ROUTE_OBJECTS: RouteObject[] = KNOWN_PATTERNS.map((path) => ({ path }));

/**
 * Returns true when `pathname` matches any registered route pattern.
 * Strips query strings and hashes before matching. Always returns true
 * for empty / falsy paths (those are sentinel "no-op" tabs handled by
 * the nav itself, e.g. the create button).
 */
export function isKnownRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  // sentinel values used by nav components for non-routing tabs
  if (pathname === "__space__" || pathname.startsWith("#")) return true;
  const clean = pathname.split("?")[0].split("#")[0];
  if (!clean.startsWith("/")) return false;
  // react-router's matchRoutes can't parse "@:slug" prefix params; handle the
  // public handle route (/@handle) manually so nav links to it pass validation.
  if (/^\/@[^/]+$/.test(clean)) return true;
  return matchRoutes(ROUTE_OBJECTS, clean) !== null;
}

/**
 * Returns `path` if it resolves to a known route, otherwise `fallback`.
 * Use at click time to guarantee a nav button never lands on a 404.
 */
export function safeNavPath(path: string, fallback = "/dashboard"): string {
  return isKnownRoute(path) ? path : fallback;
}

/**
 * Dev-only sanity check: pass an array of `{ label, path }` entries and
 * the component name; any unknown route gets a console.error so the drift
 * shows up immediately in the preview. Silent in production.
 */
export function validateNavPaths(
  entries: ReadonlyArray<{ label: string; path?: string | null }>,
  source: string,
): void {
  if (!import.meta.env.DEV) return;
  const broken = entries.filter(
    (e) => e.path && !isKnownRoute(e.path),
  );
  if (broken.length === 0) return;
   
  console.error(
    `[routeRegistry] ${source} has nav entries pointing at unknown routes:`,
    broken.map((b) => `${b.label} → ${b.path}`),
  );
}
