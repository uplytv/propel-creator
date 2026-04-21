import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

// --- Module-level controls so individual tests can flip behavior ---
let autoRetryEnabledFlag = false;
const navigateMock = vi.fn();
let updateCallPayloads: any[] = [];
let insertCallPayloads: any[] = [];
let shouldUpdateThrow = false;
let updateThrowCount = 0; // throw N times then succeed

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user", email: "test@example.com" } }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

// A flexible chainable Supabase mock. Each terminal method returns a Promise
// resolving to { data, error }. `.update(...).eq(...)` resolves to {} as well.
vi.mock("@/integrations/supabase/client", () => {
  const makeBuilder = (table: string) => {
    const builder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn(function (this: any, payload: any) {
        insertCallPayloads.push({ table, payload });
        return this;
      }),
      update: vi.fn(function (this: any, payload: any) {
        updateCallPayloads.push({ table, payload });
        if (shouldUpdateThrow && updateThrowCount > 0) {
          updateThrowCount -= 1;
          // Make the awaited eq() reject
          this._shouldReject = true;
        }
        return this;
      }),
      single: vi.fn(function (this: any) {
        if (this._shouldReject) {
          return Promise.reject(new Error("Simulated DB failure"));
        }
        return Promise.resolve({ data: null, error: null });
      }),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
      // For `update(...).eq(...)` (no terminal method) — make eq itself awaitable.
      then: undefined as any,
    };
    // Make `eq` awaitable by attaching a then() that resolves once the chain
    // is awaited directly (covers `.update().eq()`).
    const originalEq = builder.eq;
    builder.eq = vi.fn(function (this: any, ...args: any[]) {
      originalEq.apply(this, args);
      // Return a thenable proxy that still supports further chaining.
      const self = this;
      return new Proxy(self, {
        get(target, prop) {
          if (prop === "then") {
            return (resolve: any, reject: any) => {
              if (target._shouldReject) {
                reject(new Error("Simulated DB failure"));
              } else {
                resolve({ data: null, error: null });
              }
            };
          }
          return (target as any)[prop];
        },
      });
    });
    return builder;
  };

  const fromMock = vi.fn((table: string) => {
    const b = makeBuilder(table);
    // count: head queries — `.select("*", { count: "exact", head: true })`
    // is awaited directly. Make select awaitable when called with a head opt.
    const originalSelect = b.select;
    b.select = vi.fn(function (this: any, _cols: any, opts: any) {
      originalSelect.apply(this, arguments as any);
      if (opts && opts.head) {
        return Promise.resolve({ data: null, count: 42, error: null });
      }
      return this;
    });
    return b;
  });

  return {
    supabase: {
      from: fromMock,
      rpc: vi.fn(async () => ({ data: null })),
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
          getPublicUrl: () => ({ data: { publicUrl: "" } }),
        }),
      },
      functions: { invoke: vi.fn(async () => ({ data: null })) },
    },
  };
});

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/lib/affiliateCookies", () => ({
  getAffiliateCookie: () => null,
  clearAffiliateCookie: () => {},
  getReferralData: () => ({ code: null, username: null, name: null }),
  clearReferralData: () => {},
}));

vi.mock("@/lib/cooldownToast", () => ({ showCooldownToast: vi.fn() }));
vi.mock("@/lib/referralUrls", () => ({ buildReferralUrl: () => "https://example.com" }));
vi.mock("@/hooks/useAutoRetryPreference", () => ({
  useAutoRetryPreference: () => ({ enabled: autoRetryEnabledFlag }),
}));
vi.mock("@/components/onboarding/MilestoneProgressPill", () => ({
  default: () => null,
}));

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const passthrough = (tag: string) =>
    React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement(tag, { ...props, ref }, children),
    );
  return {
    motion: new Proxy({}, { get: (_t, key: string) => passthrough(key) }),
    AnimatePresence: ({ children }: any) => children,
  };
});

vi.mock("@/components/ui/select", () => {
  const React = require("react") as typeof import("react");
  const Select = ({ value, onValueChange, children }: any) => {
    const items: { value: string; label: ReactNode }[] = [];
    const walk = (node: ReactNode) => {
      React.Children.forEach(node as any, (child: any) => {
        if (!child) return;
        if (child.type && child.type.__isSelectItem) {
          items.push({ value: child.props.value, label: child.props.children });
        } else if (child.props && child.props.children) {
          walk(child.props.children);
        }
      });
    };
    walk(children);
    return (
      <>
        <select
          data-testid="mock-select"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
        >
          <option value="" />
          {items.map((it) => (
            <option key={it.value} value={it.value}>
              {typeof it.label === "string" ? it.label : it.value}
            </option>
          ))}
        </select>
        {children}
      </>
    );
  };
  const SelectTrigger = ({ children }: any) => <div>{children}</div>;
  const SelectValue = ({ placeholder }: any) => <span>{placeholder}</span>;
  const SelectContent = ({ children }: any) => <div hidden>{children}</div>;
  const SelectItem: any = ({ value, children }: any) => (
    <div data-value={value}>{children}</div>
  );
  SelectItem.__isSelectItem = true;
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: 390,
  });
  Object.defineProperty(window, "innerHeight", {
    writable: true,
    configurable: true,
    value: 844,
  });
  window.localStorage.clear();
  window.sessionStorage.clear();
  navigateMock.mockClear();
  updateCallPayloads = [];
  insertCallPayloads = [];
  autoRetryEnabledFlag = false;
  shouldUpdateThrow = false;
  updateThrowCount = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

import Onboarding from "./Onboarding";

function renderOnboarding() {
  vi.useFakeTimers();
  const utils = render(<Onboarding />);
  act(() => {
    vi.advanceTimersByTime(1600);
  });
  vi.useRealTimers();
  return utils;
}

function clickContinue() {
  const continueBtn = screen
    .getAllByRole("button", { name: /Continue/i })
    .find((b) => !(b as HTMLButtonElement).disabled);
  if (!continueBtn) throw new Error("No enabled Continue button found");
  fireEvent.click(continueBtn);
}

function fillStep1(name = "Jane Doe") {
  const nameInput = screen.getByPlaceholderText(/Full name/i);
  fireEvent.change(nameInput, { target: { value: name } });
  clickContinue();
}

function fillStep2(creatorType = "Fitness") {
  const card = screen.getByRole("radio", { name: new RegExp(creatorType, "i") });
  fireEvent.click(card);
  clickContinue();
}

function fillStep3() {
  fireEvent.click(screen.getByRole("radio", { name: /Just exploring/i }));
  fireEvent.change(screen.getByPlaceholderText(/I teach first-generation investors/i), {
    target: { value: "I teach beginners how to invest." },
  });
  clickContinue();
}

async function advanceToStep4() {
  renderOnboarding();
  fillStep1();
  fillStep2();
  await screen.findByText(/Where are you right now\?/i);
  fillStep3();
  await screen.findByText(/Step 4 of 4/i);
}

const submitButton = () =>
  screen.getByRole("button", { name: /Submit Application/i }) as HTMLButtonElement;

const goalButton = (label: RegExp) =>
  screen.getByRole("button", { name: label }) as HTMLButtonElement;

const timelineButton = (label: RegExp) =>
  screen.getByRole("button", { name: label }) as HTMLButtonElement;

function fillStep4Required() {
  fireEvent.click(goalButton(/Grow my audience/i));
  fireEvent.click(timelineButton(/Next 30 days/i));
}

// =================== SUCCESS STATE ===================

describe("Onboarding Step 4 — successful submission", () => {
  it("shows 'Application submitted!' overlay and navigates to /waitlist?applied=true", async () => {
    await advanceToStep4();
    fillStep4Required();

    fireEvent.click(submitButton());

    // Success overlay appears.
    await waitFor(() => {
      expect(screen.getByText(/Application submitted!/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Redirecting…/i)).toBeInTheDocument();

    // Navigation fires after the 1200ms post-success delay.
    await waitFor(
      () => {
        expect(navigateMock).toHaveBeenCalledWith("/waitlist?applied=true", {
          replace: true,
        });
      },
      { timeout: 3000 },
    );
  });

  it("calls Supabase profile.update and waitlist.insert with the form values", async () => {
    await advanceToStep4();
    fillStep4Required();

    fireEvent.click(submitButton());

    await waitFor(() => {
      expect(screen.getByText(/Application submitted!/i)).toBeInTheDocument();
    });

    // Profile update payload. Step 1 captures the entire entered string into
    // `firstName` (placeholder is "Full name"), so first_name == "Jane Doe"
    // and last_name is empty.
    const profileUpdate = updateCallPayloads.find((c) => c.table === "profiles");
    expect(profileUpdate).toBeDefined();
    expect(profileUpdate.payload).toMatchObject({
      first_name: "Jane Doe",
      last_name: "",
      role_type: "creator",
      onboarding_complete: true,
      creator_type: "Fitness",
    });
    expect(profileUpdate.payload.display_name).toMatch(/^Jane Doe\s*$/);

    // Waitlist insert carries Step 1–3 answers.
    const waitlistInsert = insertCallPayloads.find((c) => c.table === "waitlist");
    expect(waitlistInsert).toBeDefined();
    expect(waitlistInsert.payload).toMatchObject({
      email: "test@example.com",
      creator_type: "Fitness",
      one_sentence: "I teach beginners how to invest.",
      user_id: "test-user",
    });
    expect(waitlistInsert.payload.full_name).toMatch(/^Jane Doe\s*$/);
  });

  it("stores waitlist position metadata in sessionStorage on success", async () => {
    await advanceToStep4();
    fillStep4Required();

    fireEvent.click(submitButton());

    await waitFor(() => {
      expect(screen.getByText(/Application submitted!/i)).toBeInTheDocument();
    });

    // Position is read off the insert response (mocked as null) → falls back to 0.
    expect(window.sessionStorage.getItem("waitlist_position")).toBe("0");
    expect(window.sessionStorage.getItem("waitlist_display_name")).toBe("Jane Doe");
    expect(window.sessionStorage.getItem("waitlist_email")).toBe("test@example.com");
  });
});

// =================== AUTO-RETRY COUNTDOWN ===================

describe("Onboarding Step 4 — auto-retry countdown after submission failure", () => {
  it("shows 'Submission failed' overlay with countdown when auto-retry is enabled", async () => {
    autoRetryEnabledFlag = true;
    shouldUpdateThrow = true;
    updateThrowCount = 99; // keep failing so we can observe countdown UI

    await advanceToStep4();
    fillStep4Required();

    fireEvent.click(submitButton());

    // Failure overlay surfaces.
    expect(await screen.findByText(/Submission failed/i)).toBeInTheDocument();

    // Countdown text appears (5s starting value from AUTO_RETRY_SECONDS).
    // The "Retrying in" copy lives inside nested aria-live wrappers so it can
    // legitimately match more than one element — accept any match.
    const matches = await screen.findAllByText((_, node) =>
      !!node && /retrying in/i.test(node.textContent || ""),
    );
    expect(matches.length).toBeGreaterThan(0);

    // The visible countdown number matches AUTO_RETRY_SECONDS = 5.
    expect(screen.getByText("5s")).toBeInTheDocument();
  });

  it("triggers a second submission attempt automatically when the countdown reaches zero", async () => {
    autoRetryEnabledFlag = true;
    shouldUpdateThrow = true;
    updateThrowCount = 1; // first attempt fails, second succeeds

    await advanceToStep4();
    fillStep4Required();

    // First attempt — fails after the awaited update path.
    fireEvent.click(submitButton());
    expect(await screen.findByText(/Submission failed/i)).toBeInTheDocument();

    // Wait through the 5s real-timer countdown, then for the success overlay.
    // (AUTO_RETRY_SECONDS = 5 → ~5s ticking + a re-submit roundtrip.)
    await waitFor(
      () => {
        expect(screen.getByText(/Application submitted!/i)).toBeInTheDocument();
      },
      { timeout: 10000, interval: 100 },
    );
  }, 15000);

  it("shows static 'Auto-retry is off' messaging when the preference is disabled", async () => {
    autoRetryEnabledFlag = false;
    shouldUpdateThrow = true;
    updateThrowCount = 99;

    await advanceToStep4();
    fillStep4Required();

    fireEvent.click(submitButton());

    expect(await screen.findByText(/Submission failed/i)).toBeInTheDocument();
    const offMatches = screen.getAllByText((_, node) =>
      !!node && /Auto-retry is\s+off/i.test(node.textContent || ""),
    );
    expect(offMatches.length).toBeGreaterThan(0);
    // No countdown number rendered.
    expect(screen.queryByText(/^\d+s$/)).not.toBeInTheDocument();
  });
});

// =================== FIELD-LEVEL VALIDATION DEPTH ===================

describe("Onboarding Step 4 — field-level validation depth", () => {
  it("clears only the goals error after a goal is picked, then clears the timeline error after a timeline is picked", async () => {
    await advanceToStep4();

    fireEvent.click(submitButton());

    // Both errors visible.
    expect(
      await screen.findByText(/Please pick at least one goal to continue\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Please choose a timeline to continue\./i),
    ).toBeInTheDocument();

    // Selecting any goal clears step4AttemptedSubmit → both errors disappear.
    fireEvent.click(goalButton(/Grow my audience/i));
    expect(
      screen.queryByText(/Please pick at least one goal to continue\./i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Please choose a timeline to continue\./i),
    ).not.toBeInTheDocument();
  });

  it("re-shows the timeline error if the goal is filled but Submit is clicked again without a timeline", async () => {
    await advanceToStep4();

    fireEvent.click(submitButton());
    expect(
      await screen.findByText(/Please choose a timeline to continue\./i),
    ).toBeInTheDocument();

    // Pick a goal — clears errors.
    fireEvent.click(goalButton(/Grow my audience/i));
    expect(
      screen.queryByText(/Please choose a timeline to continue\./i),
    ).not.toBeInTheDocument();

    // Submit again without a timeline → only the timeline error returns.
    fireEvent.click(submitButton());
    expect(
      await screen.findByText(/Please choose a timeline to continue\./i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Please pick at least one goal to continue\./i),
    ).not.toBeInTheDocument();
  });

  it("Back navigates from Step 4 to Step 3 and preserves the goals/timeline selections on return", async () => {
    await advanceToStep4();

    fireEvent.click(goalButton(/Launch a product/i));
    fireEvent.click(timelineButton(/Next 60 days/i));

    // Click Back.
    const backButton = screen.getByRole("button", { name: /Back/i });
    fireEvent.click(backButton);

    // We're back on Step 3.
    expect(await screen.findByText(/Where are you right now\?/i)).toBeInTheDocument();

    // Continue forward again — selections should still be set.
    clickContinue();
    await screen.findByText(/Step 4 of 4/i);

    expect(goalButton(/Launch a product/i).getAttribute("aria-pressed")).toBe("true");
    expect(timelineButton(/Next 60 days/i).getAttribute("aria-pressed")).toBe("true");

    // And submitting now succeeds without re-filling.
    fireEvent.click(submitButton());
    await waitFor(() => {
      expect(screen.getByText(/Application submitted!/i)).toBeInTheDocument();
    });
  });
});

// =================== ERROR BANNER + MANUAL RETRY ===================

describe("Onboarding Step 4 — submission error banner & manual retry", () => {
  it("shows the 'Submission failed' error banner with the simulated DB failure message", async () => {
    autoRetryEnabledFlag = false;
    shouldUpdateThrow = true;
    updateThrowCount = 99; // keep failing

    await advanceToStep4();
    fillStep4Required();
    fireEvent.click(submitButton());

    // Banner header.
    expect(await screen.findByText(/Submission failed/i)).toBeInTheDocument();

    // Banner body surfaces the underlying error message from the rejected promise.
    // (Rendered in both the overlay and the inline Step 4 banner — accept any.)
    const errorMessages = await screen.findAllByText(/Simulated DB failure/i);
    expect(errorMessages.length).toBeGreaterThan(0);

    // The overlay is announced as an alertdialog (role assigned when submitError is set).
    const overlay = screen.getByRole("alertdialog");
    expect(overlay).toBeInTheDocument();

    // "Retry now" button is present and enabled so the user can recover manually.
    const retryBtn = screen.getByRole("button", { name: /Retry now/i }) as HTMLButtonElement;
    expect(retryBtn).toBeInTheDocument();
    expect(retryBtn.disabled).toBe(false);

    // Auto-retry is off → no countdown number rendered.
    expect(screen.queryByText(/^\d+s$/)).not.toBeInTheDocument();
  });

  it("clicking 'Retry now' after a failure dismisses the error and completes the submission successfully", async () => {
    autoRetryEnabledFlag = false;
    shouldUpdateThrow = true;
    updateThrowCount = 1; // first attempt fails, retry succeeds

    await advanceToStep4();
    fillStep4Required();

    // Initial submission fails.
    fireEvent.click(submitButton());
    expect(await screen.findByText(/Submission failed/i)).toBeInTheDocument();

    // Click manual "Retry now".
    fireEvent.click(screen.getByRole("button", { name: /Retry now/i }));

    // Error overlay clears and success overlay appears.
    await waitFor(() => {
      expect(screen.queryByText(/Submission failed/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Application submitted!/i)).toBeInTheDocument();
    });

    // Two profile.update calls — failed attempt + successful retry.
    const profileUpdates = updateCallPayloads.filter((c) => c.table === "profiles");
    expect(profileUpdates.length).toBeGreaterThanOrEqual(2);

    // Final waitlist insert went through on the retry.
    const waitlistInsert = insertCallPayloads.find((c) => c.table === "waitlist");
    expect(waitlistInsert).toBeDefined();
    expect(waitlistInsert!.payload).toMatchObject({
      email: "test@example.com",
      user_id: "test-user",
    });

    // Eventually navigates after the post-success delay.
    await waitFor(
      () => {
        expect(navigateMock).toHaveBeenCalledWith("/waitlist?applied=true", {
          replace: true,
        });
      },
      { timeout: 3000 },
    );
  });

  it("clicking 'Dismiss' clears the error banner without retrying", async () => {
    autoRetryEnabledFlag = false;
    shouldUpdateThrow = true;
    updateThrowCount = 99;

    await advanceToStep4();
    fillStep4Required();
    fireEvent.click(submitButton());

    expect(await screen.findByText(/Submission failed/i)).toBeInTheDocument();

    const updatesBeforeDismiss = updateCallPayloads.filter((c) => c.table === "profiles").length;

    // The dismiss button is labeled "Dismiss" when no countdown is active.
    fireEvent.click(screen.getByRole("button", { name: /^Dismiss$/i }));

    // Overlay closes.
    await waitFor(() => {
      expect(screen.queryByText(/Submission failed/i)).not.toBeInTheDocument();
    });

    // No additional submission attempt was triggered by Dismiss.
    const updatesAfterDismiss = updateCallPayloads.filter((c) => c.table === "profiles").length;
    expect(updatesAfterDismiss).toBe(updatesBeforeDismiss);
  });
});
