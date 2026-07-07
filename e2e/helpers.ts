// Shared helpers for the UPLY e2e smoke suite.
//
// SAFETY CONTRACT (production Stripe may be LIVE-mode):
//   - Never complete a payment; never focus/fill anything inside a Stripe iframe.
//   - Only disposable accounts: e2e+<tag>-<timestamp>@uply-test.dev.
//   - Never publish/post public content; never create junk data beyond those
//     disposable accounts (and whatever the app itself provisions for them).

import { test as base, expect, type Page } from "@playwright/test";

/** Disposable, uniquely-timestamped test email. */
export function disposableEmail(tag: string): string {
  return `e2e+${tag}-${Date.now()}@uply-test.dev`;
}

/** Meets the app's password policy (8+ chars, 1 uppercase, 1 number). */
export function disposablePassword(): string {
  return `E2eSmoke${Date.now()}!Aa1`;
}

/**
 * Base test with UPLY-specific page prep:
 *  - skips the animated splash screen (sessionStorage flag read by AppWithSplash)
 *  - blocks analytics/error-tracking egress (PostHog, Sentry) so e2e runs don't
 *    pollute product analytics and don't add network flake
 *  - collects console/page errors on `pageErrors` for boundary-state detection
 */
// eslint-disable comments below: Playwright fixtures use a `use` callback that
// the React hooks lint rule misreads as a React hook; empty pattern is the
// documented Playwright signature for fixtures without dependencies.
export const test = base.extend<{ pageErrors: string[] }>({
  // eslint-disable-next-line no-empty-pattern
  pageErrors: async ({}, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use([]);
  },
  page: async ({ page, pageErrors }, use) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem("uply_splash_shown", "1");
      } catch {
        /* storage unavailable — splash just plays */
      }
    });
    await page.route(
      /posthog\.com|sentry\.io|ingest\.[a-z0-9.-]*sentry/i,
      (route) => route.abort()
    );
    page.on("console", (msg) => {
      if (msg.type() === "error") pageErrors.push(msg.text());
    });
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect };

/**
 * "Sign out" without depending on any particular UI: drop the Supabase session
 * (sb-*-auth-token in localStorage) and reload. Equivalent end state to a UI
 * sign-out for routing purposes.
 */
export async function clearSupabaseSession(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("sb-"))
      .forEach((k) => localStorage.removeItem(k));
  });
  await page.reload();
}

/** Assert we ended up on the auth screen (ProtectedRoute redirect target). */
export async function expectAuthScreen(page: Page): Promise<void> {
  await page.waitForURL(/\/auth(\?|$)/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: /welcome back|create your free account/i })
  ).toBeVisible();
}

/** Text markers of the NotFound page — a resolver dead-end if ever shown. */
export const NOT_FOUND_MARKERS = /this page wandered off|we couldn't find/i;
