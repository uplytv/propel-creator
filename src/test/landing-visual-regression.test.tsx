/**
 * Visual regression tests for the landing page.
 *
 * jsdom can't take pixel screenshots, so we capture a structural snapshot of
 * each landing section's rendered DOM (tags + classes + text). Any unintended
 * change to layout, copy, or Tailwind classes will fail the snapshot and force
 * a deliberate `vitest -u` update — catching UI drift early.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";

// HomepagePricing renders TrialSignupModal (closed), which needs an auth
// context and Stripe's loader — stub both so the section renders standalone.
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: null, session: null, loading: false }),
}));
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: () => Promise.resolve(null),
}));

import HomepageNav from "@/components/landing/v2/HomepageNav";
import HomepageHero from "@/components/landing/v2/HomepageHero";
import HomepagePricing from "@/components/landing/v2/HomepagePricing";
import HomepageFinalCTA from "@/components/landing/v2/HomepageFinalCTA";
import HomepageFooter from "@/components/landing/v2/HomepageFooter";

afterEach(() => {
  vi.useRealTimers();
});

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("Landing page — visual regression (DOM snapshots)", () => {
  it("HomepageNav matches snapshot", () => {
    const { container } = renderWithRouter(<HomepageNav />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("HomepageHero matches snapshot (initial rotating headline)", () => {
    // Freeze timers so the rotating headline can't advance mid-render.
    vi.useFakeTimers();
    const { container } = renderWithRouter(<HomepageHero />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("HomepagePricing matches snapshot (monthly default)", () => {
    const { container } = renderWithRouter(<HomepagePricing />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("HomepageFinalCTA matches snapshot", () => {
    const { container } = renderWithRouter(<HomepageFinalCTA />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("HomepageFooter matches snapshot (year pinned to 2026)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T00:00:00Z"));
    const { container } = renderWithRouter(<HomepageFooter />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
