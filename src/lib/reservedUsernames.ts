/**
 * Reserved usernames — Phase 2 security hardening.
 *
 * The bare `/:username` catch-all is the LAST route in App.tsx, so a profile
 * whose username equals a real route's first segment can never be reached
 * (e.g. username "dashboard" is permanently shadowed by /dashboard), and a
 * future route addition could be shadowed the other way. This module derives
 * the reserved set systematically from the route registry (single source of
 * truth for App.tsx routes) plus static additions for routes/vanity pages not
 * in the registry and infrastructure names.
 *
 * The same list is enforced server-side by the BEFORE INSERT/UPDATE trigger
 * `enforce_username_rules` on public.profiles (migration
 * 20260706191000_reserved_usernames.sql). Keep the two in sync: this file is
 * the human-readable source; the migration hardcodes the expanded output.
 */

import { KNOWN_PATTERNS } from "./routeRegistry";

/** Valid username shape: lowercase letters, digits, underscore; 3–30 chars. */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

// Route first segments that exist in App.tsx but are intentionally NOT in the
// route registry (vanity/artist/marketing pages), plus the roster artist slugs
// that resolve to platform-owned pages, plus generic infrastructure and
// impersonation-sensitive names.
const STATIC_RESERVED: string[] = [
  // — directive statics —
  "api", "admin", "auth", "assets", "static", "vs", "community", "crm",
  "purchases", "ads_manager", "adsmanager", "my_page", "mypage", "site",
  "blog", "roster", "pricing", "discover", "dashboard", "settings", "wallet",
  // — App.tsx segments not present in the route registry —
  "apply", "aria", "arya", "aryaxo", "aryaxoblog", "aryaxolinks",
  "aryaxosite", "blake", "blakethegreat", "founders", "founderoffers",
  "founderservices", "health", "ppv", "upgrade",
  // — roster artist vanity slugs (ARTIST_ROSTER + hardcoded aliases) —
  "omid", "omidmusic", "omid_music", "morvarid", "morvaridshahbazi",
  "andy", "andymusic", "andymusic1", "bazi", "bobby", "sonuha",
  // — infrastructure / impersonation-sensitive —
  "about", "account", "app", "billing", "contact", "docs", "edge",
  "functions", "graphql", "help", "home", "legal", "login", "logout",
  "mail", "official", "realtime", "rest", "root", "security", "signin",
  "signup", "storage", "support", "system", "team", "test", "uply",
  "uplytv", "user", "users", "webhook", "webhooks", "www",
];

/**
 * A route segment like "ads-manager" cannot itself be a username (dashes are
 * outside the username charset), but its natural username spellings can sit
 * confusingly close to a real route — reserve both the compact and the
 * underscore spelling alongside the raw segment.
 */
function segmentVariants(segment: string): string[] {
  const lower = segment.toLowerCase();
  const compact = lower.replace(/[^a-z0-9_]/g, "");
  const underscored = lower.replace(/-+/g, "_").replace(/[^a-z0-9_]/g, "");
  return [lower, compact, underscored];
}

function routeFirstSegments(): string[] {
  const out: string[] = [];
  for (const pattern of KNOWN_PATTERNS) {
    const seg = pattern.split("/")[1];
    if (!seg) continue; // "/"
    if (seg.startsWith(":") || seg.startsWith("@") || seg.startsWith("*")) continue;
    out.push(seg);
  }
  return out;
}

function buildReservedSet(): Set<string> {
  const set = new Set<string>();
  for (const seg of [...routeFirstSegments(), ...STATIC_RESERVED]) {
    for (const v of segmentVariants(seg)) {
      if (v.length > 0) set.add(v);
    }
  }
  return set;
}

/** Every handle that must never become a profile username. */
export const RESERVED_USERNAMES: ReadonlySet<string> = buildReservedSet();

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.trim().toLowerCase());
}

/**
 * Full client-side validation for a username the user is trying to claim.
 * Returns an error message, or null when the username is acceptable.
 * Mirrors the server-side trigger `enforce_username_rules`.
 */
export function validateUsername(username: string): string | null {
  const value = username.trim();
  if (value.length === 0) return null; // clearing the username is allowed
  if (value.length < USERNAME_MIN_LENGTH || value.length > USERNAME_MAX_LENGTH) {
    return `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters.`;
  }
  if (!USERNAME_PATTERN.test(value)) {
    return "Username may only use lowercase letters, numbers, and underscores.";
  }
  if (isReservedUsername(value)) {
    return "That username is reserved. Please choose another.";
  }
  return null;
}
