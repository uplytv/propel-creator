import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreatorTour, { CREATOR_TOUR_STEPS } from "./CreatorTour";

/**
 * Keyboard-only accessibility test for the CreatorTour live region.
 *
 * Verifies that after a Skip → Reopen lifecycle, a keyboard-only user can
 * still walk the tour using Tab to focus the "Next" control and Enter to
 * advance, AND that the live region announces each step's title + body
 * after every keyboard-driven step change.
 */

const ANNOUNCE_DELAY_MS = 100; // > 80ms internal debounce

const renderTour = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <CreatorTour forceOpen />
    </MemoryRouter>,
  );

const queryLiveRegion = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('[data-testid="creator-tour-live-region"]');

const getLiveRegion = (): HTMLElement => {
  const el = queryLiveRegion();
  if (!el) throw new Error("Live region not found");
  return el;
};

const expectAriaContract = (region: HTMLElement) => {
  expect(region.getAttribute("role")).toBe("status");
  expect(region.getAttribute("aria-live")).toBe("polite");
  expect(region.getAttribute("aria-atomic")).toBe("true");
  expect(region.className).toContain("sr-only");
};

const findButtonByText = (needle: string): HTMLButtonElement => {
  const buttons = Array.from(document.querySelectorAll("button"));
  const match = buttons.find((b) => {
    const aria = (b.getAttribute("aria-label") || "").toLowerCase();
    const text = (b.textContent || "").toLowerCase();
    return aria.includes(needle) || text.includes(needle);
  });
  if (!match) throw new Error(`Button matching "${needle}" not found`);
  return match as HTMLButtonElement;
};

const findSkipButton = () => findButtonByText("skip");

/**
 * Find the "Next"/CTA button — the primary advance control. We match on the
 * step's CTA text, falling back to "next". The Skip button is excluded so we
 * don't accidentally close the tour.
 */
const findAdvanceButton = (ctaHint?: string): HTMLButtonElement => {
  const buttons = Array.from(document.querySelectorAll("button")).filter(
    (b) => !(b.getAttribute("aria-label") || "").toLowerCase().includes("skip"),
  );
  const wanted = (ctaHint || "next").toLowerCase();
  const match =
    buttons.find((b) => (b.textContent || "").toLowerCase().includes(wanted)) ||
    buttons.find((b) => (b.textContent || "").toLowerCase().includes("next")) ||
    buttons.find((b) => (b.textContent || "").toLowerCase().includes("got it")) ||
    buttons.find((b) => (b.textContent || "").toLowerCase().includes("start"));
  if (!match) throw new Error("Advance button not found");
  return match as HTMLButtonElement;
};

const expectedMessage = (idx: number) => {
  const s = CREATOR_TOUR_STEPS[idx];
  return `Step ${idx + 1} of ${CREATOR_TOUR_STEPS.length}. ${s.title}. ${s.body}`;
};

/**
 * Simulate a keyboard-only advance: focus the target via Tab semantics, then
 * press Enter. We send a real keydown so any handlers attached to the button
 * fire as they would in a browser; native button activation on Enter then
 * triggers click via fireEvent.click (jsdom doesn't auto-activate).
 */
const keyboardActivate = (btn: HTMLButtonElement) => {
  btn.focus();
  expect(document.activeElement).toBe(btn);
  fireEvent.keyDown(btn, { key: "Enter", code: "Enter" });
  fireEvent.keyUp(btn, { key: "Enter", code: "Enter" });
  // Browsers translate Enter on a focused <button> into a click; jsdom does
  // not, so we dispatch the click that the keypress would have produced.
  fireEvent.click(btn);
};

describe("CreatorTour — keyboard-only live region announcements after skip + reopen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("announces each step via the live region when navigated by keyboard after a skip + reopen cycle", () => {
    renderTour();
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });

    // Initial Step 1 announcement is in place with full ARIA contract.
    expectAriaContract(getLiveRegion());
    expect(getLiveRegion().textContent).toBe(expectedMessage(0));

    // Skip the tour with the keyboard (Tab to Skip button → Enter).
    const skip = findSkipButton();
    keyboardActivate(skip);
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(queryLiveRegion()).toBeNull();

    // Reopen the tour via the imperative launch event (Replay tour button).
    act(() => {
      window.dispatchEvent(new CustomEvent("uply:launch-tour"));
    });

    // Region remounts immediately — empty so the next text is announced fresh.
    const region = getLiveRegion();
    expectAriaContract(region);
    expect(region.textContent).toBe("");

    // Step 1 announces after the debounce.
    act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
    expect(getLiveRegion().textContent).toBe(expectedMessage(0));

    // Now walk every remaining step via keyboard activation only, verifying
    // that the live region clears then re-announces the new step text.
    for (let i = 1; i < CREATOR_TOUR_STEPS.length; i++) {
      const cta = CREATOR_TOUR_STEPS[i - 1].cta;
      const advance = findAdvanceButton(cta);
      keyboardActivate(advance);

      // Immediately after the keyboard-driven step change, the region clears
      // so screen readers will treat the next message as new content.
      expect(getLiveRegion().textContent).toBe("");

      // After the debounce, the new step's full message is announced and the
      // ARIA contract is still intact.
      act(() => { vi.advanceTimersByTime(ANNOUNCE_DELAY_MS); });
      const announced = getLiveRegion();
      expectAriaContract(announced);
      expect(announced.textContent).toBe(expectedMessage(i));
    }
  });
});
