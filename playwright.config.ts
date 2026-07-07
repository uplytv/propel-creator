// Playwright e2e configuration — UPLY smoke suite (Tier 1: protect the money path).
//
// Runs against the LOCAL dev server (npm run dev on :8080), which talks to the
// REAL Supabase project. Safety rules baked into the suite (see e2e/smoke.spec.ts):
//   - Tests NEVER complete a payment and NEVER type into the Stripe iframe.
//   - Only disposable accounts (e2e+<timestamp>@uply-test.dev) are ever created.
//   - Nothing is published or posted.
//
// Browser install: `npx playwright install chromium` (no elevation normally
// needed — browsers land in %LOCALAPPDATA%\ms-playwright). If the download is
// blocked, the suite code still typechecks/lints; run it once install succeeds.
//
// Run with: npm run test:e2e

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.artifacts",
  fullyParallel: true,
  // One retry: dev-server first-hit compiles + live-backend latency make cold
  // runs jittery; trace captured on the retry for real diagnosis.
  retries: 1,
  workers: process.env.CI ? 2 : 2,
  forbidOnly: !!process.env.CI,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  // Quiet, CI-friendly output: line reporter + HTML report that never auto-opens.
  reporter: [
    ["line"],
    ["html", { outputFolder: "./e2e/.report", open: "never" }],
  ],
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
