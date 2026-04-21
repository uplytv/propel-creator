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

describe("showCooldownToast — focus is never trapped (regression)", () => {
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

  // Renders trigger + two sibling focusables (before/after) so we can assert
  // that Tab/Shift+Tab can escape the toast in both directions — i.e. the
  // toast doesn't behave like a focus-trapping modal dialog.
  const renderHarness = (variant: CooldownToastVariant) => {
    const onAction = vi.fn();
    render(
      <>
        <button type="button">before</button>
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
        <button type="button">after</button>
        <Toaster />
      </>,
    );
    return {
      user: userEvent.setup({
        advanceTimers: vi.advanceTimersByTime.bind(vi),
      }),
      before: screen.getByRole("button", { name: "before" }),
      trigger: screen.getByRole("button", { name: `trigger-${variant}` }),
      after: screen.getByRole("button", { name: "after" }),
      onAction,
    };
  };

  const variants: CooldownToastVariant[] = ["error", "warning", "success"];

  it.each(variants)(
    "[%s] Tab can move focus past the toast to the next page control",
    async (variant) => {
      const { user, trigger, after } = renderHarness(variant);

      trigger.focus();
      await act(async () => {
        trigger.click();
      });
      await flushMount();

      // Tab forward up to a generous bound; if focus is trapped inside the
      // toast it will never reach the "after" page button.
      for (let i = 0; i < 10 && document.activeElement !== after; i++) {
        await user.tab();
      }
      expect(after).toHaveFocus();
    },
  );

  it.each(variants)(
    "[%s] Shift+Tab can move focus back past the toast to the previous page control",
    async (variant) => {
      const { user, trigger, before } = renderHarness(variant);

      trigger.focus();
      await act(async () => {
        trigger.click();
      });
      await flushMount();

      for (let i = 0; i < 10 && document.activeElement !== before; i++) {
        await user.tab({ shift: true });
      }
      expect(before).toHaveFocus();
    },
  );

  it.each(variants)(
    "[%s] tabbing through the toast and back still restores focus to the trigger on action",
    async (variant) => {
      const { user, trigger, after, onAction } = renderHarness(variant);

      trigger.focus();
      await act(async () => {
        trigger.click();
      });
      await flushMount();

      // Walk focus past the toast onto an unrelated control during cooldown.
      for (let i = 0; i < 10 && document.activeElement !== after; i++) {
        await user.tab();
      }
      expect(after).toHaveFocus();

      await advance(SETTINGS_NAV_COOLDOWN_MS);

      const action = screen.getByRole("button", { name: /^Try again$/ });
      action.focus();
      await user.keyboard("{Enter}");

      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      expect(onAction).toHaveBeenCalledTimes(1);
      // Captured-at-show focus wins → restored to the original trigger,
      // *not* the unrelated "after" button focus passed through.
      expect(trigger).toHaveFocus();
    },
  );

  it.each(variants)(
    "[%s] Shift+Tab during cooldown then auto-dismiss still restores focus to the trigger",
    async (variant) => {
      const { user, trigger, before } = renderHarness(variant);

      trigger.focus();
      await act(async () => {
        trigger.click();
      });
      await flushMount();

      for (let i = 0; i < 10 && document.activeElement !== before; i++) {
        await user.tab({ shift: true });
      }
      expect(before).toHaveFocus();

      await advance(SETTINGS_NAV_COOLDOWN_MS);
      await advance(8000);
      await act(async () => {
        vi.advanceTimersByTime(10);
      });

      expect(trigger).toHaveFocus();
    },
  );

  it.each(variants)(
    "[%s] toast root is not aria-modal and does not advertise dialog semantics",
    async (variant) => {
      const { trigger } = renderHarness(variant);
      trigger.focus();
      await act(async () => {
        trigger.click();
      });
      await flushMount();

      // Sentinel against accidentally introducing dialog/modal semantics that
      // would imply (and typically enforce) a focus trap.
      const action = screen.getByRole("button", { name: /Try again/ });
      const toastRoot = action.closest("li") as HTMLElement | null;
      expect(toastRoot).not.toBeNull();
      expect(toastRoot!.getAttribute("aria-modal")).toBeNull();
      expect(toastRoot!.getAttribute("role")).not.toBe("dialog");
      expect(toastRoot!.getAttribute("role")).not.toBe("alertdialog");
    },
  );
});

describe("showCooldownToast — mouse vs keyboard parity (regression)", () => {
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

  const drainRestore = async () => {
    await act(async () => {
      vi.advanceTimersByTime(10);
    });
  };

  type Activation = "click" | "enter" | "space";

  const setup = (variant: CooldownToastVariant) => {
    const onAction = vi.fn();
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
    return {
      user: userEvent.setup({
        advanceTimers: vi.advanceTimersByTime.bind(vi),
      }),
      trigger: screen.getByRole("button", { name: `trigger-${variant}` }),
      onAction,
    };
  };

  // Single source of truth: open the toast, run the chosen activation method,
  // and return what callers need to make per-path assertions.
  const runActivation = async (
    variant: CooldownToastVariant,
    method: Activation,
  ) => {
    const ctx = setup(variant);
    ctx.trigger.focus();
    await act(async () => {
      ctx.trigger.click();
    });
    await flushMount();

    await advance(SETTINGS_NAV_COOLDOWN_MS);

    const action = screen.getByRole("button", { name: /^Try again$/ });

    if (method === "click") {
      await ctx.user.click(action);
    } else {
      action.focus();
      await ctx.user.keyboard(method === "enter" ? "{Enter}" : " ");
    }

    await drainRestore();
    return { ...ctx, action };
  };

  const variants: CooldownToastVariant[] = ["error", "warning", "success"];
  const methods: Activation[] = ["click", "enter", "space"];

  it.each(
    variants.flatMap((v) => methods.map((m) => [v, m] as const)),
  )(
    "[%s · %s] invokes onAction exactly once",
    async (variant, method) => {
      const { onAction } = await runActivation(variant, method);
      expect(onAction).toHaveBeenCalledTimes(1);
    },
  );

  it.each(
    variants.flatMap((v) => methods.map((m) => [v, m] as const)),
  )(
    "[%s · %s] dismisses the toast (action button is gone)",
    async (variant, method) => {
      await runActivation(variant, method);
      // Sonner removes the toast on action; allow its 200ms exit animation.
      await advance(250);
      expect(
        screen.queryByRole("button", { name: /^Try again$/ }),
      ).not.toBeInTheDocument();
    },
  );

  it.each(
    variants.flatMap((v) => methods.map((m) => [v, m] as const)),
  )(
    "[%s · %s] restores focus to the trigger",
    async (variant, method) => {
      const { trigger } = await runActivation(variant, method);
      expect(trigger).toHaveFocus();
    },
  );

  it.each(variants)(
    "[%s] post-activation focus target is identical across click/Enter/Space",
    async (variant) => {
      // Compare the focus outcome from each path independently. Re-rendering
      // between runs produces fresh DOM nodes, so we record per-run whether
      // focus landed on that run's own trigger.
      const seen: string[] = [];
      for (const method of methods) {
        const { trigger } = await runActivation(variant, method);
        seen.push(document.activeElement === trigger ? "trigger" : "other");
        document.body.innerHTML = "";
        sessionStorage.clear();
        vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
      }
      expect(seen).toEqual(["trigger", "trigger", "trigger"]);
    },
  );

  it.each(variants)(
    "[%s] all three activation paths leave no lingering action button",
    async (variant) => {
      for (const method of methods) {
        await runActivation(variant, method);
        await advance(250);
        expect(
          screen.queryByRole("button", { name: /^Try again$/ }),
        ).not.toBeInTheDocument();
        document.body.innerHTML = "";
        sessionStorage.clear();
        vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
      }
    },
  );
});

