/**
 * Visual regression tests for the landing page.
 *
 * We can't take pixel screenshots inside jsdom, so we capture a structural
 * snapshot of each landing section's rendered DOM (tags + classes + text).
 * Any unintended change to layout, copy, or Tailwind classes will fail the
 * snapshot and force a deliberate `vitest -u` update — catching UI drift early.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";

import HomepageNav from "@/components/landing/v2/HomepageNav";
import HomepageHero from "@/components/landing/v2/HomepageHero";
import HomepagePricing from "@/components/landing/v2/HomepagePricing";
import HomepageFinalCTA from "@/components/landing/v2/HomepageFinalCTA";
import HomepageFooter from "@/components/landing/v2/HomepageFooter";

// Pin the system clock so the footer's © {year} stays deterministic.
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
});
afterAll(() => {
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
    // Don't advance timers — capture the first rotating headline only so the
    // snapshot stays deterministic across runs.
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

  it("HomepageFooter matches snapshot (system time pinned to 2026)", () => {
    const { container } = renderWithRouter(<HomepageFooter />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
