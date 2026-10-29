// UPLY Tier-1 smoke suite — protects the money path without ever spending money.
//
// HARD SAFETY RULES (Stripe may be LIVE-mode):
//   - Never submit card details; never interact with a Stripe iframe at all.
//   - The trial funnel is exercised only to the checkout BOUNDARY: Step 2 shows
//     plan radios, ToS, and an enabled "Continue to checkout" button. We do not
//     click it — that would open hosted Checkout (checkout.stripe.com).
//   - Only disposable accounts (e2e+<ts>@uply-test.dev) are created.
//
// Selector philosophy: roles, accessible names, and user-visible text — no
// generated class names.

import { test, expect, disposableEmail, disposablePassword, clearSupabaseSession, expectAuthScreen, NOT_FOUND_MARKERS } from "./helpers";

// ---------------------------------------------------------------------------
// 1. Public pages load
// ---------------------------------------------------------------------------

test.describe("public pages", () => {
  test("landing: hero + trial CTA visible", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: /operating system for creators/i })
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("button", { name: /start your 14-day free trial/i }).first()
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /explore creators/i }).first()).toBeVisible();
  });

  test("/pricing renders plan chooser", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /choose your plan/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("/discover renders search header", async ({ page }) => {
    await page.goto("/discover");
    await expect(
      page.getByRole("heading", { level: 1, name: /discover creators/i })
    ).toBeVisible({ timeout: 20_000 });
  });

  test("/roster renders the artist roster hub", async ({ page }) => {
    await page.goto("/roster");
    await expect(page.getByText(/uply roster/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveTitle(/roster/i);
  });

  test("/vs/skool comparison page renders (not redirected)", async ({ page }) => {
    await page.goto("/vs/skool");
    await expect(page).toHaveURL(/\/vs\/skool/);
    await expect(page.getByText(/skool/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveTitle(/uply vs skool/i);
  });

  test("artist site /arya-xo-site renders", async ({ page }) => {
    await page.goto("/arya-xo-site");
    await expect(page.getByText(/150 bands/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("/privacy renders the policy", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Trial funnel — to the boundary, never past it
// ---------------------------------------------------------------------------

test.describe("trial funnel (money path — boundary only)", () => {
  test("home CTA -> step 1 (4 fields) -> step 2 -> checkout boundary state", async ({ page }, testInfo) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: /start your 14-day free trial/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/start your 14-day free trial today/i)).toBeVisible();

    // Step 1 — exactly the four GHL-simple fields; no password asked up front.
    const company = dialog.getByLabel("Company name");
    const fullName = dialog.getByLabel("Full name");
    const email = dialog.getByLabel("Email address");
    const phone = dialog.getByLabel("Phone number");
    await expect(company).toBeVisible();
    await expect(fullName).toBeVisible();
    await expect(email).toBeVisible();
    await expect(phone).toBeVisible();
    await expect(dialog.locator('input[type="password"]')).toHaveCount(0);

    const testEmail = disposableEmail("trial");
    await company.fill("E2E Smoke Co");
    await fullName.fill("E2E Smoke");
    await email.fill(testEmail);
    await phone.fill("5555550100");
    testInfo.annotations.push({ type: "disposable-account", description: testEmail });

    // Creates the disposable account against the real Supabase, then advances.
    await dialog.getByRole("button", { name: /go to step 2/i }).click();

    // Landing must stay put while the trial modal is open. Step 1 creates a
    // session; uply_trial_in_progress tells Landing not to redirect to /apply
    // and unmount the modal before Step 2.
    await Promise.race([
      dialog.getByRole("radio").first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => {}),
      page.waitForURL((url) => url.pathname !== "/", { timeout: 30_000 }).catch(() => {}),
    ]);
    expect(
      new URL(page.url()).pathname,
      "BUG: account creation triggered Landing's authed redirect, destroying the trial modal before the payment step — the trial funnel from the home CTA never reaches checkout"
    ).toBe("/");

    // Step 2 — plan radios + terms visible.
    await expect(dialog.getByRole("radio")).toHaveCount(3, { timeout: 30_000 });
    await expect(dialog.getByText(/uply starter/i).first()).toBeVisible();
    await expect(dialog.getByText(/day free trial — then \$/i).first()).toBeVisible();

    const terms = dialog.getByRole("checkbox");
    await expect(terms).toBeVisible();
    await expect(dialog.getByText(/i agree to the/i)).toBeVisible();

    const continueCheckout = dialog.getByRole("button", { name: /continue to checkout/i });
    const emailConfirm = dialog.getByText(/check your email to confirm your account/i);

    // Two legitimate boundaries. We never click Continue — that leaves the
    // site for hosted Checkout and would mint a live Checkout Session.
    //   continue-button — plan confirmed path; button enables once ToS is ticked
    //   email-confirm   — Supabase requires email confirmation before payment
    const deadline = Date.now() + 30_000;
    let outcome: "continue-button" | "email-confirm" | null = null;
    while (!outcome && Date.now() < deadline) {
      if ((await emailConfirm.count()) > 0) outcome = "email-confirm";
      else if ((await continueCheckout.count()) > 0) outcome = "continue-button";
      else await page.waitForTimeout(500);
    }
    testInfo.annotations.push({
      type: "checkout-boundary",
      description: outcome ?? "none (timed out waiting for a checkout state)",
    });
    expect(
      outcome,
      "Step 2 must show Continue to checkout, or the email-confirm card"
    ).not.toBeNull();

    if (outcome === "continue-button") {
      await expect(continueCheckout).toBeDisabled();
      await terms.click();
      await expect(terms).toBeChecked();
      await expect(continueCheckout).toBeEnabled();
      // No embedded Payment Element. Hosted Checkout opens only after the click.
      await expect(dialog.locator("iframe")).toHaveCount(0);
    }

    // Paranoia: the success state must never appear — that would mean a live
    // trial subscription was actually created past the boundary.
    await expect(dialog.getByText(/trial is live/i)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Auth — member signup path
// ---------------------------------------------------------------------------

test.describe("auth", () => {
  test("member signup lands away from creator onboarding, then sign out", async ({ page }, testInfo) => {
    await page.goto("/auth?mode=signup&as=member");
    await expect(page.getByRole("heading", { name: /create your free account/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/join communities, take free courses/i)).toBeVisible();

    const testEmail = disposableEmail("member");
    testInfo.annotations.push({ type: "disposable-account", description: testEmail });
    await page.getByLabel("Name", { exact: true }).fill("E2E Member");
    await page.getByLabel("Email", { exact: true }).fill(testEmail);
    await page.getByLabel("Password", { exact: true }).fill(disposablePassword());
    await page.getByRole("button", { name: /create account/i }).click();

    // Two legitimate outcomes against the live project:
    //   A) auto-confirm ON  -> session -> redirected to /discover (member path)
    //   B) confirmation ON  -> "Check your email" card, no session
    // Either way we must NEVER be routed into creator onboarding.
    const discover = page.waitForURL(/\/discover/, { timeout: 45_000 }).then(() => "discover" as const);
    const confirm = page
      .getByRole("heading", { name: /check your email/i })
      .waitFor({ state: "visible", timeout: 45_000 })
      .then(() => "email-confirm" as const);
    const outcome = await Promise.race([
      discover.catch(() => null),
      confirm.catch(() => null),
    ]);
    testInfo.annotations.push({ type: "signup-outcome", description: outcome ?? "none" });
    expect(outcome, "signup must land on /discover or the email-confirm card").not.toBeNull();
    expect(page.url()).not.toMatch(/\/onboarding/);

    if (outcome === "discover") {
      await expect(
        page.getByRole("heading", { level: 1, name: /discover creators/i })
      ).toBeVisible();
      // Sign out (session-drop equivalent) and prove protected routes lock again.
      await clearSupabaseSession(page);
      await page.goto("/crm");
      await expectAuthScreen(page);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Gating — anon sees the join view / the gate, never the goods
// ---------------------------------------------------------------------------

test.describe("gating", () => {
  test("anon community visit shows join-first view", async ({ page }) => {
    await page.goto("/bazi/community");
    await expect(page.getByRole("heading", { name: /bazi inner circle/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/what members get/i)).toBeVisible();
    const join = page.getByRole("link", { name: /join bazi inner circle/i });
    await expect(join).toBeVisible();
    await expect(join).toHaveAttribute("href", "/auth");
    await expect(page.getByText("$9", { exact: true })).toBeVisible();
  });

  test("anon paid course page shows gate (enroll CTA), not lesson content", async ({ page }) => {
    await page.goto("/bazi/courses/open-format-foundations");
    await expect(
      page.getByRole("heading", { name: /open-format djing: foundations/i })
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("$49", { exact: true })).toBeVisible();
    const enroll = page.getByRole("link", { name: /enroll now/i });
    await expect(enroll).toBeVisible();
    await expect(enroll).toHaveAttribute("href", "/auth");
    // The gate: outline only — no playable lesson media for anon visitors.
    await expect(page.locator("video")).toHaveCount(0);
    await expect(page.locator("audio")).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Route hygiene
// ---------------------------------------------------------------------------

test.describe("route hygiene", () => {
  for (const path of ["/crm", "/ads-manager", "/purchases"]) {
    test(`anon ${path} redirects to auth`, async ({ page }) => {
      await page.goto(path);
      await expectAuthScreen(page);
    });
  }

  test("unknown /vs/<junk> redirects home", async ({ page }) => {
    await page.goto("/vs/definitely-not-a-competitor-e2e");
    await page.waitForURL((url) => url.pathname === "/", { timeout: 20_000 });
    await expect(
      page.getByRole("button", { name: /start your 14-day free trial/i }).first()
    ).toBeVisible({ timeout: 20_000 });
  });

  test("nonsense /@handle resolves via never-404 chain (no dead end)", async ({ page }) => {
    const junk = `e2e-noexist-${Date.now()}`;
    await page.goto(`/@${junk}`);
    // The resolver chain (community -> profile -> site -> blog -> /roster)
    // must redirect somewhere real rather than render a Not Found dead end.
    await page.waitForURL((url) => !url.pathname.includes(junk), { timeout: 30_000 });
    await expect(page.getByText(NOT_FOUND_MARKERS)).toHaveCount(0);
    // Junk handles fall through to the roster hub.
    await expect(page).toHaveURL(/\/roster/);
    await expect(page.getByText(/uply roster/i).first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 6. Builder
// ---------------------------------------------------------------------------

test.describe("builder", () => {
  test("anon /my-page redirects to auth", async ({ page }) => {
    await page.goto("/my-page");
    await expectAuthScreen(page);
  });
});
