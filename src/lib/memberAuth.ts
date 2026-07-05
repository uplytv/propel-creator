/**
 * Free-member signup entry (two-sided access model).
 *
 * Builds `/auth?mode=signup&as=member&redirect=<path>` — the member persona
 * skips creator onboarding and the approval waitlist (see Auth.tsx), and
 * returns the user to where they hit the join/enroll action. Auth.tsx
 * sanitizes `redirect` (same-origin paths only).
 */
export function memberAuthUrl(redirectTo?: string): string {
  const target =
    redirectTo ??
    (typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/discover");
  return `/auth?mode=signup&as=member&redirect=${encodeURIComponent(target)}`;
}
