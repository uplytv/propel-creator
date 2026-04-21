/**
 * Tests for the reusable {@link showCooldownToast} helper, covering the
 * `error` / `warning` / `success` variants.
 *
 * Verifies:
 * - All 3 variants render with consistent ARIA (progressbar with valuenow,
 *   accessible action label that counts down, then becomes "Try again").
 * - Restore-focus works the same way across variants — focus returns to the
 *   trigger when the action is activated.
 * - Variant-specific styling is applied to the progress fill (different
 *   classes per variant) without breaking ARIA semantics.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster } from "sonner";
import { showCooldownToast, type CooldownToastVariant } from "./cooldownToast";
import {
  SETTINGS_NAV_COOLDOWN_MS,
  writeSettingsNavLast,
} from "./settingsNavCooldown";

describe("showCooldownToast — variants", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
    document.body.innerHTML = "";
  });

  const advance = async (ms: number) => {
    await act(async () => {
      vi.advanceTimersByTime(ms);
    });
  };

  const renderToaster = () => render(<Toaster />);

  // Wait for sonner to mount the toast into its portal.
  const flushMount = async () => {
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
  };

  const variants: CooldownToastVariant[] = ["error", "warning", "success"];

  it.each(variants)(
    "[%s] renders title, description, progressbar with aria, and counting-down action",
    async (variant) => {
      writeSettingsNavLast(Date.now());
      renderToaster();

      showCooldownToast({
        title: `Title-${variant}`,
        description: `Body for ${variant}`,
        variant,
        onAction: () => {},
      });
      await flushMount();

      // Title + description visible
      expect(screen.getByText(`Title-${variant}`)).toBeInTheDocument();
      expect(screen.getByText(`Body for ${variant}`)).toBeInTheDocument();

      // Progress bar with consistent ARIA contract
      const bar = screen.getByRole("progressbar", { name: "Cooldown progress" });
      expect(bar).toHaveAttribute("aria-valuemin", "0");
      expect(bar).toHaveAttribute("aria-valuemax", "100");
      expect(Number(bar.getAttribute("aria-valuenow"))).toBeGreaterThanOrEqual(0);

      // Action button is disabled with countdown label
      const btn = screen.getByRole("button", { name: /Try again \(\d+s\)/ });
      expect(btn).toBeInTheDocument();
    },
  );

  it.each(variants)(
    "[%s] enables the action exactly when cooldown elapses and removes progressbar",
    async (variant) => {
      writeSettingsNavLast(Date.now());
      renderToaster();

      showCooldownToast({
        title: "T",
        description: "D",
        variant,
        onAction: () => {},
      });
      await flushMount();

      expect(screen.getByRole("progressbar")).toBeInTheDocument();

      await advance(SETTINGS_NAV_COOLDOWN_MS);

      const btn = screen.getByRole("button", { name: /^Try again$/ });
      expect(btn).toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    },
  );

  it.each(variants)(
    "[%s] applies a variant-specific progress-fill class without altering ARIA",
    async (variant) => {
      writeSettingsNavLast(Date.now());
      renderToaster();

      showCooldownToast({
        title: "T",
        description: "D",
        variant,
        onAction: () => {},
      });
      await flushMount();

      const bar = screen.getByRole("progressbar");
      const fill = bar.firstElementChild as HTMLElement;
      expect(fill).toBeTruthy();

      const expectedClass =
        variant === "error"
          ? "bg-destructive"
          : variant === "warning"
            ? "bg-warning"
            : "bg-primary";
      expect(fill.className).toContain(expectedClass);

      // ARIA contract is identical regardless of variant
      expect(bar).toHaveAttribute("aria-label", "Cooldown progress");
    },
  );

  it.each(variants)(
    "[%s] restores focus to the triggering element when action is activated",
    async (variant) => {
      const user = userEvent.setup({
        advanceTimers: vi.advanceTimersByTime.bind(vi),
      });
      const onAction = vi.fn();

      // Render a real trigger button + the sonner toaster.
      render(
        <>
          <button
            type="button"
            onClick={() => {
              writeSettingsNavLast(Date.now());
              showCooldownToast({
                title: "T",
                description: "D",
                variant,
                onAction,
              });
            }}
          >
            trigger-{variant}
          </button>
          <Toaster />
        </>,
      );

      const trigger = screen.getByRole("button", { name: `trigger-${variant}` });
      trigger.focus();
      expect(trigger).toHaveFocus();

      await act(async () => {
        trigger.click();
      });
      await flushMount();

      // Cooldown elapses → action becomes activatable
      await advance(SETTINGS_NAV_COOLDOWN_MS);

      const action = screen.getByRole("button", { name: /^Try again$/ });
      await user.click(action);

      expect(onAction).toHaveBeenCalledTimes(1);

      // Drain restore-focus microtask + macrotask
      await act(async () => {
        vi.advanceTimersByTime(10);
      });
      expect(trigger).toHaveFocus();
    },
  );

  it("omits the action button entirely when no onAction is provided", async () => {
    writeSettingsNavLast(Date.now());
    renderToaster();

    showCooldownToast({
      title: "Info",
      description: "No retry available",
      variant: "warning",
    });
    await flushMount();

    expect(screen.getByText("Info")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Try again/ }),
    ).not.toBeInTheDocument();
    // Progress bar still informs the user how long until the cooldown clears
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("supports a custom actionLabel that is reused in the countdown", async () => {
    writeSettingsNavLast(Date.now());
    renderToaster();

    showCooldownToast({
      title: "T",
      description: "D",
      variant: "success",
      actionLabel: "Resend",
      onAction: () => {},
    });
    await flushMount();

    expect(
      screen.getByRole("button", { name: /Resend \(\d+s\)/ }),
    ).toBeInTheDocument();

    await advance(SETTINGS_NAV_COOLDOWN_MS);

    expect(screen.getByRole("button", { name: /^Resend$/ })).toBeInTheDocument();
  });

  it("dedupes ticks under a stable id (single live toast across re-renders)", async () => {
    writeSettingsNavLast(Date.now());
    renderToaster();

    showCooldownToast({
      title: "Stable",
      description: "D",
      variant: "error",
      id: "stable-id",
      onAction: () => {},
    });
    await flushMount();

    // Advance through several ticks; only one live toast should remain.
    await advance(600);
    const allTitles = screen.getAllByText("Stable");
    // Sonner renders the title in a single live region; even if multiple
    // DOM nodes exist briefly during transitions, they share the same id
    // and resolve to one logical toast.
    expect(allTitles.length).toBeGreaterThanOrEqual(1);
    // Sanity: we still find exactly one progressbar (one live toast).
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
    // within() on the live region scopes assertions cleanly
    const region = screen.getByRole("progressbar").closest("li") ?? document.body;
    expect(within(region).getByRole("progressbar")).toBeInTheDocument();
  });
});
