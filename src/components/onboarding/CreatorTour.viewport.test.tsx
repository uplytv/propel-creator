import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorTour from "./CreatorTour";

/**
 * Visual/DOM regression test for the First Dollar wizard popover.
 *
 * Guards against the historical bug where the tour card extended past the
 * right edge on a 430px mobile viewport (framer-motion's `transform` was
 * clobbering a `translate(-50%, -50%)` centering hack). We render the tour,
 * read the inline styles produced by the positioning math, and assert the
 * card's bounding box stays within `[0, viewport]` on both portrait and
 * landscape orientations.
 */

const PORTRAIT = { w: 430, h: 932 };
const LANDSCAPE = { w: 932, h: 430 };
const SIDE_MARGIN = 16;

const setViewport = (w: number, h: number) => {
  Object.defineProperty(window, "innerWidth", { value: w, configurable: true, writable: true });
  Object.defineProperty(window, "innerHeight", { value: h, configurable: true, writable: true });
};

const findTooltipCard = (): HTMLElement => {
  // The tooltip is rendered into document.body via a portal. It's the only
  // fixed-position card with explicit width inline style.
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("div[style*='width']"),
  );
  const card = candidates.find(
    (el) => el.style.position === "fixed" && el.style.width && el.style.left,
  );
  if (!card) throw new Error("Tour tooltip card not found in DOM");
  return card;
};

const readBox = (el: HTMLElement) => {
  const left = parseFloat(el.style.left);
  const top = parseFloat(el.style.top);
  const width = parseFloat(el.style.width);
  return { left, top, width, right: left + width };
};

describe("CreatorTour — popover stays inside mobile viewport", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    localStorage.clear();
  });

  const renderTour = () =>
    render(
      <MemoryRouter>
        <CreatorTour forceOpen />
      </MemoryRouter>,
    );

  it("keeps the welcome popover within a 430px portrait viewport", () => {
    setViewport(PORTRAIT.w, PORTRAIT.h);
    renderTour();

    // Flush rAF / measurement timers so positioning settles.
    act(() => {
      vi.advanceTimersByTime(700);
    });

    const card = findTooltipCard();
    const box = readBox(card);

    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(PORTRAIT.w);
    // Width must respect the side-margin clamp.
    expect(box.width).toBeLessThanOrEqual(PORTRAIT.w - SIDE_MARGIN * 2);
    // And the card should actually be horizontally centered (within 1px).
    const centerOffset = Math.abs(box.left + box.width / 2 - PORTRAIT.w / 2);
    expect(centerOffset).toBeLessThanOrEqual(1);
  });

  it("repositions to stay inside the viewport after rotating to landscape", () => {
    setViewport(PORTRAIT.w, PORTRAIT.h);
    renderTour();
    act(() => {
      vi.advanceTimersByTime(700);
    });

    // Rotate the device.
    setViewport(LANDSCAPE.w, LANDSCAPE.h);
    act(() => {
      window.dispatchEvent(new Event("resize"));
      window.dispatchEvent(new Event("orientationchange"));
      vi.advanceTimersByTime(100);
    });

    const card = findTooltipCard();
    const box = readBox(card);

    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(LANDSCAPE.w);
    // Re-centered after rotation.
    const centerOffset = Math.abs(box.left + box.width / 2 - LANDSCAPE.w / 2);
    expect(centerOffset).toBeLessThanOrEqual(1);
  });
});
