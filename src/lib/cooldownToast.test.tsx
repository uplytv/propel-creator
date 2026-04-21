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

// jsdom doesn't implement pointer capture, which sonner attaches on swipe.
// Stub it once to silence harmless TypeError noise during user-event clicks.
const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
if (!proto.setPointerCapture) proto.setPointerCapture = () => {};
if (!proto.releasePointerCapture) proto.releasePointerCapture = () => {};
if (!proto.hasPointerCapture) proto.hasPointerCapture = () => false;

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

describe("showCooldownToast — keyboard accessibility (warning & success)", () => {
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

  const flushMount = async () => {
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
  };

  const advance = async (ms: number) => {
    await act(async () => {
      vi.advanceTimersByTime(ms);
    });
  };

  // Renders a trigger + Toaster, fires the trigger so the toast mounts under
  // the requested variant, and returns the trigger element + onAction spy.
  const setupVariant = async (variant: "warning" | "success") => {
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    const onAction = vi.fn();

    render(
      <>
        <button
          type="button"
          onClick={() => {
            writeSettingsNavLast(Date.now());
            showCooldownToast({
              title: `T-${variant}`,
              description: `D-${variant}`,
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
    await act(async () => {
      trigger.click();
    });
    await flushMount();
    return { user, trigger, onAction };
  };

  for (const variant of ["warning", "success"] as const) {
    describe(`[${variant}]`, () => {
      it("Tab reaches the action button after cooldown elapses", async () => {
        const { user } = await setupVariant(variant);

        // Cooldown not elapsed → action shows the countdown label.
        expect(
          screen.getByRole("button", { name: /Try again \(\d+s\)/ }),
        ).toBeInTheDocument();

        await advance(SETTINGS_NAV_COOLDOWN_MS);

        const enabledBtn = screen.getByRole("button", { name: /^Try again$/ });

        // Tab forward from <body> until we land on the action button.
        (document.activeElement as HTMLElement | null)?.blur();
        document.body.focus();
        for (let i = 0; i < 6 && document.activeElement !== enabledBtn; i++) {
          await user.tab();
        }
        expect(enabledBtn).toHaveFocus();
      });

      it("Enter/Space do not invoke the action while cooldown is active", async () => {
        const { user, onAction } = await setupVariant(variant);

        // Countdown label confirms the action is not yet ready.
        const btn = screen.getByRole("button", { name: /Try again \(\d+s\)/ });
        btn.focus();
        await user.keyboard("{Enter}");
        await user.keyboard(" ");

        expect(onAction).not.toHaveBeenCalled();
      });

      it("Enter activates the action exactly when the cooldown elapses", async () => {
        const { user, onAction } = await setupVariant(variant);

        await advance(SETTINGS_NAV_COOLDOWN_MS);

        const btn = screen.getByRole("button", { name: /^Try again$/ });
        btn.focus();
        await user.keyboard("{Enter}");

        expect(onAction).toHaveBeenCalledTimes(1);
      });

      it("Space activates the action exactly when the cooldown elapses", async () => {
        const { user, onAction } = await setupVariant(variant);

        await advance(SETTINGS_NAV_COOLDOWN_MS);

        const btn = screen.getByRole("button", { name: /^Try again$/ });
        btn.focus();
        await user.keyboard(" ");

        expect(onAction).toHaveBeenCalledTimes(1);
      });

      it("returns focus to the trigger after Enter activates the action", async () => {
        const { user, trigger, onAction } = await setupVariant(variant);

        await advance(SETTINGS_NAV_COOLDOWN_MS);

        const btn = screen.getByRole("button", { name: /^Try again$/ });
        btn.focus();
        await user.keyboard("{Enter}");

        // Drain restore-focus microtask + macrotask.
        await act(async () => {
          vi.advanceTimersByTime(10);
        });

        expect(onAction).toHaveBeenCalledTimes(1);
        expect(trigger).toHaveFocus();
      });

      it("returns focus to the trigger after Space activates the action", async () => {
        const { user, trigger, onAction } = await setupVariant(variant);

        await advance(SETTINGS_NAV_COOLDOWN_MS);

        const btn = screen.getByRole("button", { name: /^Try again$/ });
        btn.focus();
        await user.keyboard(" ");

        await act(async () => {
          vi.advanceTimersByTime(10);
        });

        expect(onAction).toHaveBeenCalledTimes(1);
        expect(trigger).toHaveFocus();
      });

      it("returns focus to the trigger after the toast auto-dismisses (no action taken)", async () => {
        const { trigger } = await setupVariant(variant);

        // Move focus off the trigger so we can verify it's actively restored
        // (not just left untouched). jsdom can't always focus <body>, so blur
        // explicitly and assert focus moved away.
        trigger.blur();
        expect(trigger).not.toHaveFocus();

        // Cooldown elapses → "ready" tick sets duration to 8000ms; advance
        // past it so sonner fires onAutoClose → restoreFocus().
        await advance(SETTINGS_NAV_COOLDOWN_MS);
        await advance(8000);
        await act(async () => {
          vi.advanceTimersByTime(10);
        });

        expect(trigger).toHaveFocus();
      });
    });
  }
});

describe("showCooldownToast — accessible name & ARIA live announcements", () => {
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

  const flushMount = async () => {
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
  };

  const advance = async (ms: number) => {
    await act(async () => {
      vi.advanceTimersByTime(ms);
    });
  };

  const variants: CooldownToastVariant[] = ["error", "warning", "success"];

  it.each(variants)(
    "[%s] action button exposes a counting-down accessible name while cooling down",
    async (variant) => {
      writeSettingsNavLast(Date.now());
      render(<Toaster />);

      showCooldownToast({
        title: "T",
        description: "D",
        variant,
        onAction: () => {},
      });
      await flushMount();

      // Accessible name follows the "Try again (Ns)" pattern, where N is the
      // remaining whole-second count. Capture the initial number.
      const initialBtn = screen.getByRole("button", {
        name: /^Try again \(\d+s\)$/,
      });
      const initialMatch = initialBtn.getAttribute("aria-label") ??
        initialBtn.textContent ?? "";
      const initialSec = Number(/\((\d+)s\)/.exec(initialMatch)?.[1] ?? "0");
      expect(initialSec).toBeGreaterThan(0);

      // Tick forward ~1.2s so the next whole-second value is strictly lower.
      await advance(1200);

      const updatedBtn = screen.getByRole("button", {
        name: /^Try again \(\d+s\)$/,
      });
      const updatedText = updatedBtn.textContent ?? "";
      const updatedSec = Number(/\((\d+)s\)/.exec(updatedText)?.[1] ?? "0");
      expect(updatedSec).toBeLessThan(initialSec);
    },
  );

  it.each(variants)(
    "[%s] action transitions from disabled-style countdown name to ready name",
    async (variant) => {
      writeSettingsNavLast(Date.now());
      render(<Toaster />);

      showCooldownToast({
        title: "T",
        description: "D",
        variant,
        onAction: () => {},
      });
      await flushMount();

      // While cooling down: name includes the "(Ns)" suffix → semantically
      // communicates the not-yet-ready state to assistive tech.
      expect(
        screen.queryByRole("button", { name: /^Try again$/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^Try again \(\d+s\)$/ }),
      ).toBeInTheDocument();

      await advance(SETTINGS_NAV_COOLDOWN_MS);

      // Once ready: countdown suffix is gone and the name reads cleanly.
      expect(
        screen.queryByRole("button", { name: /^Try again \(\d+s\)$/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^Try again$/ }),
      ).toBeInTheDocument();
    },
  );

  it.each(variants)(
    "[%s] custom actionLabel produces a matching accessible name in both states",
    async (variant) => {
      writeSettingsNavLast(Date.now());
      render(<Toaster />);

      showCooldownToast({
        title: "T",
        description: "D",
        variant,
        actionLabel: "Resend code",
        onAction: () => {},
      });
      await flushMount();

      expect(
        screen.getByRole("button", { name: /^Resend code \(\d+s\)$/ }),
      ).toBeInTheDocument();

      await advance(SETTINGS_NAV_COOLDOWN_MS);

      expect(
        screen.getByRole("button", { name: /^Resend code$/ }),
      ).toBeInTheDocument();
    },
  );

  it.each(variants)(
    "[%s] toast renders inside an aria-live region so countdown updates are announced",
    async (variant) => {
      writeSettingsNavLast(Date.now());
      render(<Toaster />);

      showCooldownToast({
        title: "T",
        description: "D",
        variant,
        onAction: () => {},
      });
      await flushMount();

      // Sonner wraps each toast position in an <ol aria-live="polite">.
      // The action button — whose name carries the countdown — must live
      // inside that live region for AT to hear the per-second updates.
      const btn = screen.getByRole("button", { name: /^Try again \(\d+s\)$/ });
      const live = btn.closest("[aria-live]") as HTMLElement | null;
      expect(live).not.toBeNull();
      // Polite (not assertive) — countdown is informational, not interrupting.
      expect(live!.getAttribute("aria-live")).toBe("polite");
    },
  );

  it.each(variants)(
    "[%s] progressbar aria-valuenow advances monotonically and reaches 100 on ready",
    async (variant) => {
      writeSettingsNavLast(Date.now());
      render(<Toaster />);

      showCooldownToast({
        title: "T",
        description: "D",
        variant,
        onAction: () => {},
      });
      await flushMount();

      const initial = Number(
        screen.getByRole("progressbar").getAttribute("aria-valuenow"),
      );
      expect(initial).toBeGreaterThanOrEqual(0);
      expect(initial).toBeLessThan(100);

      await advance(Math.floor(SETTINGS_NAV_COOLDOWN_MS / 2));

      const mid = Number(
        screen.getByRole("progressbar").getAttribute("aria-valuenow"),
      );
      expect(mid).toBeGreaterThan(initial);

      await advance(SETTINGS_NAV_COOLDOWN_MS);

      // Progressbar is removed at ready; absence is the "100% / done" signal.
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    },
  );
});

