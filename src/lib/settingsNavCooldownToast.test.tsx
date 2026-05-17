import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { useEffect, useState } from "react";
import {
  SETTINGS_NAV_COOLDOWN_MS,
  computeCooldownState,
  readSettingsNavLast,
  writeSettingsNavLast,
} from "./settingsNavCooldown";
import { captureFocus, type FocusRestorer } from "./restoreFocus";

/**
 * Mirrors the toast body rendered by Onboarding.tsx's `showErrorWithCountdown`.
 * Kept in this test file so we can render it in isolation (sonner toasts are
 * portal-rendered and not trivially queryable). The behavior under test —
 * label + progress bar updating on a 200ms tick — is identical.
 */
function CooldownToast({
  description,
  onActivate,
}: {
  description: string;
  onActivate?: () => void;
}) {
  const [, force] = useState(0);
  // Capture focus once when the toast first mounts; restore on unmount or
  // when the action is activated. Mirrors Onboarding.tsx behavior.
  const [restoreFocus] = useState<FocusRestorer>(() => captureFocus());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      const state = computeCooldownState(readSettingsNavLast());
      force((n) => n + 1);
      if (!state.ready) timer = setTimeout(tick, 200);
    };
    tick();
    return () => {
      if (timer) clearTimeout(timer);
      restoreFocus();
    };
  }, [restoreFocus]);

  const state = computeCooldownState(readSettingsNavLast());
  return (
    <div>
      <p>{description}</p>
      {!state.ready && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(state.elapsedPct)}
          aria-label="Cooldown progress"
        >
          <div data-testid="progress-fill" style={{ width: `${state.elapsedPct}%` }} />
        </div>
      )}
      <button
        type="button"
        disabled={!state.ready}
        onClick={() => {
          if (state.ready) onActivate?.();
        }}
      >
        {state.actionLabel}
      </button>
    </div>
  );
}

describe("Settings navigation toast — cooldown UI", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  const advance = async (ms: number) => {
    await act(async () => {
      vi.advanceTimersByTime(ms);
    });
  };

  it("renders the disabled button with full countdown immediately after attempt", () => {
    writeSettingsNavLast(Date.now());
    render(<CooldownToast description="Navigation didn't complete." />);

    const btn = screen.getByRole("button", { name: /try again/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent("Try again (2s)");

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByTestId("progress-fill")).toHaveStyle({ width: "0%" });
  });

  it("updates the progress bar width and label as time advances", async () => {
    writeSettingsNavLast(Date.now());
    render(<CooldownToast description="Navigation didn't complete." />);

    // Halfway through (1000ms): ~50% width, label still says "1s"
    await advance(1000);
    const fill = screen.getByTestId("progress-fill");
    const halfWidth = parseFloat((fill.style.width || "0%").replace("%", ""));
    expect(halfWidth).toBeGreaterThanOrEqual(45);
    expect(halfWidth).toBeLessThanOrEqual(55);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", expect.stringMatching(/^(4[5-9]|5[0-5])$/));
    expect(screen.getByRole("button")).toHaveTextContent(/Try again \(1s\)/);
    expect(screen.getByRole("button")).toBeDisabled();

    // Near the end (1800ms total): ~90%, button still disabled
    await advance(800);
    const nearEndWidth = parseFloat(
      (screen.getByTestId("progress-fill").style.width || "0%").replace("%", ""),
    );
    expect(nearEndWidth).toBeGreaterThanOrEqual(85);
    expect(nearEndWidth).toBeLessThan(100);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("enables the button and removes the progress bar exactly when cooldown elapses", async () => {
    writeSettingsNavLast(Date.now());
    render(<CooldownToast description="Navigation didn't complete." />);

    expect(screen.getByRole("button")).toBeDisabled();

    // Advance to exactly the cooldown boundary.
    await advance(SETTINGS_NAV_COOLDOWN_MS);

    const btn = screen.getByRole("button");
    expect(btn).toBeEnabled();
    expect(btn).toHaveTextContent(/^Try again$/);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("renders as ready immediately when cooldown is already past (post-refresh)", () => {
    // Simulate a stale timestamp from a prior session.
    writeSettingsNavLast(Date.now() - SETTINGS_NAV_COOLDOWN_MS - 500);
    render(<CooldownToast description="Navigation didn't complete." />);

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    const btn = screen.getByRole("button");
    expect(btn).toBeEnabled();
    expect(btn).toHaveTextContent("Try again");
  });

  describe("accessibility", () => {
    it("exposes a labeled progressbar with min/max and a live aria-valuenow", async () => {
      writeSettingsNavLast(Date.now());
      render(<CooldownToast description="Navigation didn't complete." />);

      const bar = screen.getByRole("progressbar", { name: /cooldown progress/i });
      expect(bar).toHaveAttribute("aria-valuemin", "0");
      expect(bar).toHaveAttribute("aria-valuemax", "100");
      expect(bar).toHaveAttribute("aria-valuenow", "0");

      await advance(1000);
      const mid = Number(
        screen.getByRole("progressbar").getAttribute("aria-valuenow"),
      );
      expect(mid).toBeGreaterThan(0);
      expect(mid).toBeLessThan(100);
    });

    it("updates the button's accessible name as the countdown ticks", async () => {
      writeSettingsNavLast(Date.now());
      render(<CooldownToast description="Navigation didn't complete." />);

      expect(
        screen.getByRole("button", { name: "Try again (2s)" }),
      ).toBeInTheDocument();

      await advance(1000);
      expect(
        screen.getByRole("button", { name: "Try again (1s)" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Try again (2s)" }),
      ).not.toBeInTheDocument();

      await advance(1000);
      const ready = screen.getByRole("button", { name: "Try again" });
      expect(ready).toBeEnabled();
      expect(ready).toHaveAccessibleName("Try again");
    });

    it("removes the progressbar from the a11y tree once ready", async () => {
      writeSettingsNavLast(Date.now());
      render(<CooldownToast description="Navigation didn't complete." />);

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
      await advance(SETTINGS_NAV_COOLDOWN_MS);
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText(/cooldown progress/i),
      ).not.toBeInTheDocument();
    });

    it("keeps the action button discoverable via role at every stage", async () => {
      writeSettingsNavLast(Date.now());
      render(<CooldownToast description="Navigation didn't complete." />);

      expect(screen.getAllByRole("button")).toHaveLength(1);
      await advance(500);
      expect(screen.getAllByRole("button")).toHaveLength(1);
      await advance(SETTINGS_NAV_COOLDOWN_MS);
      expect(screen.getAllByRole("button")).toHaveLength(1);
    });
  });

  describe("keyboard accessibility", () => {
    // We use fireEvent (synchronous) instead of user-event for the keyboard
    // tests: user-event's async scheduler deadlocks against the toast's
    // recursive setTimeout tick when running under vi fake timers.

    it("is reachable via Tab and receives focus", () => {
      writeSettingsNavLast(Date.now() - SETTINGS_NAV_COOLDOWN_MS - 1); // already ready
      render(<CooldownToast description="Navigation didn't complete." />);

      const btn = screen.getByRole("button", { name: "Try again" });
      expect(btn).not.toHaveFocus();

      btn.focus();
      expect(btn).toHaveFocus();
    });

    it("does NOT activate on Enter while the cooldown is still running", () => {
      const onActivate = vi.fn();
      writeSettingsNavLast(Date.now());
      render(
        <CooldownToast
          description="Navigation didn't complete."
          onActivate={onActivate}
        />,
      );

      const btn = screen.getByRole("button");
      expect(btn).toBeDisabled();
      btn.focus();
      fireEvent.keyDown(btn, { key: "Enter" });
      fireEvent.keyUp(btn, { key: "Enter" });
      fireEvent.keyDown(btn, { key: " " });
      fireEvent.keyUp(btn, { key: " " });
      expect(onActivate).not.toHaveBeenCalled();
    });

    it("activates with Enter exactly when the cooldown elapses", async () => {
      const onActivate = vi.fn();
      writeSettingsNavLast(Date.now());
      render(
        <CooldownToast
          description="Navigation didn't complete."
          onActivate={onActivate}
        />,
      );

      await act(async () => {
        vi.advanceTimersByTime(SETTINGS_NAV_COOLDOWN_MS);
      });

      const btn = screen.getByRole("button", { name: "Try again" });
      expect(btn).toBeEnabled();
      btn.focus();
      expect(btn).toHaveFocus();

      // Native button activates on Enter via click event.
      fireEvent.click(btn);
      expect(onActivate).toHaveBeenCalledTimes(1);
    });

    it("activates with Space when ready", () => {
      const onActivate = vi.fn();
      writeSettingsNavLast(Date.now() - SETTINGS_NAV_COOLDOWN_MS - 1); // already ready
      render(
        <CooldownToast
          description="Navigation didn't complete."
          onActivate={onActivate}
        />,
      );

      const btn = screen.getByRole("button");
      btn.focus();
      expect(btn).toHaveFocus();

      fireEvent.click(btn);
      expect(onActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe("focus restoration", () => {
    function Harness({
      showToast,
      onActivate,
    }: {
      showToast: boolean;
      onActivate?: () => void;
    }) {
      return (
        <div>
          <button type="button" data-testid="trigger">
            Enable auto-retry
          </button>
          {showToast && (
            <CooldownToast
              description="Navigation didn't complete."
              onActivate={onActivate}
            />
          )}
        </div>
      );
    }

    it("restores focus to the previously focused element when the toast unmounts", () => {
      writeSettingsNavLast(Date.now() - SETTINGS_NAV_COOLDOWN_MS - 1); // ready
      const { rerender } = render(<Harness showToast={false} />);

      const trigger = screen.getByTestId("trigger");
      trigger.focus();
      expect(trigger).toHaveFocus();

      rerender(<Harness showToast={true} />);
      expect(trigger).toHaveFocus();

      rerender(<Harness showToast={false} />);
      expect(trigger).toHaveFocus();
    });

    it("returns focus to the trigger after the user activates 'Try again' and the toast unmounts", async () => {
      const onActivate = vi.fn();
      writeSettingsNavLast(Date.now() - SETTINGS_NAV_COOLDOWN_MS - 1); // ready

      function ActivationHarness({ initialShow }: { initialShow: boolean }) {
        const [show, setShow] = useState(initialShow);
        return (
          <div>
            <button
              type="button"
              data-testid="trigger"
              onClick={() => setShow(true)}
            >
              Enable auto-retry
            </button>
            {show && (
              <CooldownToast
                description="Navigation didn't complete."
                onActivate={() => {
                  onActivate();
                  setShow(false); // simulates toast dismissing on action
                }}
              />
            )}
          </div>
        );
      }

      render(<ActivationHarness initialShow={false} />);
      const trigger = screen.getByTestId("trigger");
      trigger.focus();
      expect(trigger).toHaveFocus();

      // User clicks the trigger → toast mounts while trigger has focus, so
      // captureFocus() records the trigger as the element to restore to.
      await act(async () => {
        trigger.click();
      });

      const action = screen.getByRole("button", { name: "Try again" });
      action.focus();
      expect(action).toHaveFocus();

      await act(async () => {
        fireEvent.click(action);
      });
      // Flush React commit + the deferred microtask + macrotask in restoreFocus.
      await act(async () => {
        await Promise.resolve();
        vi.advanceTimersByTime(0);
        await Promise.resolve();
      });

      expect(onActivate).toHaveBeenCalledTimes(1);
      expect(trigger).toHaveFocus();
    });

    it("restores focus to the trigger after the toast unmounts mid-cooldown", () => {
      writeSettingsNavLast(Date.now()); // disabled mid-cooldown
      const { rerender } = render(<Harness showToast={false} />);

      const trigger = screen.getByTestId("trigger");
      trigger.focus();
      expect(trigger).toHaveFocus();

      rerender(<Harness showToast={true} />);
      expect(trigger).toHaveFocus();

      rerender(<Harness showToast={false} />);
      expect(trigger).toHaveFocus();
    });

    it("does not throw if the previously focused element was removed before unmount", () => {
      writeSettingsNavLast(Date.now() - SETTINGS_NAV_COOLDOWN_MS - 1);
      function Removable() {
        const [showTrigger, setShowTrigger] = useState(true);
        const [showToast, setShowToast] = useState(false);
        return (
          <div>
            {showTrigger && (
              <button
                type="button"
                data-testid="trigger"
                onClick={() => {
                  setShowToast(true);
                  setShowTrigger(false);
                }}
              >
                open
              </button>
            )}
            {showToast && (
              <CooldownToast description="Navigation didn't complete." />
            )}
            <button
              type="button"
              data-testid="dismiss"
              onClick={() => setShowToast(false)}
            >
              close
            </button>
          </div>
        );
      }

      render(<Removable />);
      const open = screen.getByTestId("trigger");
      open.focus();
      act(() => {
        open.click();
      });

      // Trigger is gone after the click handler ran.
      expect(screen.queryByTestId("trigger")).not.toBeInTheDocument();

      const dismiss = screen.getByTestId("dismiss");
      // Restoring focus to a detached element must be a safe no-op.
      expect(() => act(() => { dismiss.click(); })).not.toThrow();
    });
  });
});
