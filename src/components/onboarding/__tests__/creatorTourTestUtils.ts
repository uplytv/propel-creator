/**
 * Shared selectors + helpers for CreatorTour tests.
 *
 * All lookups go through stable hooks exposed by the component:
 *   - data-testid="creator-tour-advance"     (primary CTA / Next / Finish)
 *   - data-testid="creator-tour-back"        (Back button)
 *   - data-testid="creator-tour-skip"        (Skip / X button — also aria-label="Skip tour")
 *   - data-testid="creator-tour-popover"     (the dialog card)
 *   - data-testid="creator-tour-live-region" (sr-only aria-live region)
 *
 * Tests must NEVER scan all <button> nodes by text content — text is i18n
 * volatile and selects the wrong element when other UI happens to share words
 * like "Next". Use these helpers exclusively.
 */
import { fireEvent } from "@testing-library/react";

export const TOUR_TESTID = {
  advance: "creator-tour-advance",
  back: "creator-tour-back",
  skip: "creator-tour-skip",
  popover: "creator-tour-popover",
  liveRegion: "creator-tour-live-region",
} as const;

const byTestId = <T extends HTMLElement = HTMLElement>(id: string): T | null =>
  document.querySelector<T>(`[data-testid="${id}"]`);

const requireTestId = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = byTestId<T>(id);
  if (!el) throw new Error(`CreatorTour element with data-testid="${id}" not found`);
  return el;
};

export const queryLiveRegion = (): HTMLElement | null =>
  byTestId<HTMLElement>(TOUR_TESTID.liveRegion);

export const getLiveRegion = (): HTMLElement =>
  requireTestId<HTMLElement>(TOUR_TESTID.liveRegion);

export const queryPopover = (): HTMLElement | null =>
  byTestId<HTMLElement>(TOUR_TESTID.popover);

export const getAdvanceButton = (): HTMLButtonElement =>
  requireTestId<HTMLButtonElement>(TOUR_TESTID.advance);

export const getBackButton = (): HTMLButtonElement =>
  requireTestId<HTMLButtonElement>(TOUR_TESTID.back);

export const getSkipButton = (): HTMLButtonElement =>
  requireTestId<HTMLButtonElement>(TOUR_TESTID.skip);

/**
 * Validates the advance button targets the expected step. The component
 * stamps `data-tour-step="<step.id>"` on it so tests can assert that focus /
 * activation is hitting the *current* step's CTA, not a stale render.
 */
export const expectAdvanceForStep = (stepId: string) => {
  const btn = getAdvanceButton();
  if (btn.getAttribute("data-tour-step") !== stepId) {
    throw new Error(
      `Advance button is for step "${btn.getAttribute("data-tour-step")}", expected "${stepId}"`,
    );
  }
  return btn;
};

/** Activate a button via simulated keyboard (focus → Enter keydown/up → click). */
export const keyboardActivate = (btn: HTMLButtonElement) => {
  btn.focus();
  if (document.activeElement !== btn) {
    throw new Error("keyboardActivate: button did not receive focus");
  }
  fireEvent.keyDown(btn, { key: "Enter", code: "Enter" });
  fireEvent.keyUp(btn, { key: "Enter", code: "Enter" });
  // jsdom does not auto-translate Enter on a focused button into a click.
  fireEvent.click(btn);
};

export const expectAriaContract = (region: HTMLElement) => {
  if (region.getAttribute("role") !== "status") {
    throw new Error(`Expected role="status", got "${region.getAttribute("role")}"`);
  }
  if (region.getAttribute("aria-live") !== "polite") {
    throw new Error(`Expected aria-live="polite"`);
  }
  if (region.getAttribute("aria-atomic") !== "true") {
    throw new Error(`Expected aria-atomic="true"`);
  }
  if (!region.className.includes("sr-only")) {
    throw new Error(`Expected sr-only class on live region`);
  }
};
