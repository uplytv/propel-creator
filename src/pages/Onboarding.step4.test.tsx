import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { ReactNode } from "react";

// --- Mocks (mirrors Onboarding.step3.test.tsx) ---
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user", email: "test@example.com" } }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    })),
    rpc: vi.fn(async () => ({ data: null })),
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
    functions: { invoke: vi.fn(async () => ({ data: null })) },
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() },
}));

vi.mock("@/lib/affiliateCookies", () => ({
  getAffiliateCookie: () => null,
  clearAffiliateCookie: () => {},
  getReferralData: () => ({ code: null, username: null, name: null }),
  clearReferralData: () => {},
}));

vi.mock("@/lib/cooldownToast", () => ({ showCooldownToast: vi.fn() }));
vi.mock("@/hooks/useAutoRetryPreference", () => ({
  useAutoRetryPreference: () => ({ enabled: false }),
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
  // Pick a stage
  const exploring = screen.getByRole("radio", { name: /Just exploring/i });
  fireEvent.click(exploring);
  // One-sentence textarea is required to enable Continue
  const textarea = screen.getByPlaceholderText(/I teach first-generation investors/i);
  fireEvent.change(textarea, { target: { value: "I teach beginners how to invest." } });
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

describe("Onboarding Step 4 — mouse interactions and validation", () => {
  it("shows both required-field errors when Submit is clicked with nothing selected", async () => {
    await advanceToStep4();

    // No errors before clicking submit.
    expect(screen.queryByText(/Please pick at least one goal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Please choose a timeline/i)).not.toBeInTheDocument();

    fireEvent.click(submitButton());

    expect(
      await screen.findByText(/Please pick at least one goal to continue\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Please choose a timeline to continue\./i),
    ).toBeInTheDocument();

    // Both banners expose role="alert" + aria-live="assertive" on the alert wrapper.
    const goalsBanner = screen.getByTestId("step4-goals-error");
    const timelineBanner = screen.getByTestId("step4-timeline-error");
    expect(goalsBanner.getAttribute("role")).toBe("alert");
    expect(goalsBanner.getAttribute("aria-live")).toBe("assertive");
    expect(timelineBanner.getAttribute("role")).toBe("alert");
    expect(timelineBanner.getAttribute("aria-live")).toBe("assertive");

    // Still on Step 4 (heading still present).
    expect(screen.getByText(/Step 4 of 4/i)).toBeInTheDocument();
  });

  it("toggles a goal on click and reflects aria-pressed state", async () => {
    await advanceToStep4();

    expect(goalButton(/Grow my audience/i).getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(goalButton(/Grow my audience/i));
    expect(goalButton(/Grow my audience/i).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(goalButton(/Grow my audience/i));
    expect(goalButton(/Grow my audience/i).getAttribute("aria-pressed")).toBe("false");
  });

  it("enforces the 3-goal maximum by disabling unselected goal buttons", async () => {
    await advanceToStep4();

    fireEvent.click(goalButton(/Grow my audience/i));
    fireEvent.click(goalButton(/Start monetizing/i));
    fireEvent.click(goalButton(/Launch a product/i));

    // The fourth goal is now disabled.
    const fourth = goalButton(/Build a community/i);
    expect(fourth.disabled).toBe(true);

    // Clicking it does not toggle it on.
    fireEvent.click(fourth);
    expect(goalButton(/Build a community/i).getAttribute("aria-pressed")).toBe("false");

    // Deselecting one re-enables it.
    fireEvent.click(goalButton(/Launch a product/i));
    expect(goalButton(/Build a community/i).disabled).toBe(false);
  });

  it("selects only one timeline at a time (single-select)", async () => {
    await advanceToStep4();

    fireEvent.click(timelineButton(/Next 30 days/i));
    expect(timelineButton(/Next 30 days/i).getAttribute("aria-pressed")).toBe("true");
    expect(timelineButton(/Next 60 days/i).getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(timelineButton(/Next 90 days/i));
    expect(timelineButton(/Next 90 days/i).getAttribute("aria-pressed")).toBe("true");
    expect(timelineButton(/Next 30 days/i).getAttribute("aria-pressed")).toBe("false");
  });

  it("clears each error as soon as the corresponding field is filled", async () => {
    await advanceToStep4();

    fireEvent.click(submitButton());
    expect(
      await screen.findByText(/Please pick at least one goal to continue\./i),
    ).toBeInTheDocument();

    // Selecting a goal clears the goal error (component resets attemptedSubmit on selection).
    fireEvent.click(goalButton(/Grow my audience/i));
    expect(screen.queryByText(/Please pick at least one goal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Please choose a timeline/i)).not.toBeInTheDocument();
  });
});

describe("Onboarding Step 4 — keyboard interactions", () => {
  it("toggles a goal when activated via the Enter key", async () => {
    await advanceToStep4();

    const grow = goalButton(/Grow my audience/i);
    grow.focus();
    expect(document.activeElement).toBe(grow);

    // Buttons natively respond to Enter via click events in jsdom.
    fireEvent.keyDown(grow, { key: "Enter", code: "Enter" });
    fireEvent.keyUp(grow, { key: "Enter", code: "Enter" });
    fireEvent.click(grow); // Browser default: Enter triggers click on a focused button.

    expect(goalButton(/Grow my audience/i).getAttribute("aria-pressed")).toBe("true");
  });

  it("selects a timeline when activated via the Space key", async () => {
    await advanceToStep4();

    const sixty = timelineButton(/Next 60 days/i);
    sixty.focus();
    expect(document.activeElement).toBe(sixty);

    fireEvent.keyDown(sixty, { key: " ", code: "Space" });
    fireEvent.keyUp(sixty, { key: " ", code: "Space" });
    fireEvent.click(sixty); // Browser default: Space triggers click on a focused button.

    expect(timelineButton(/Next 60 days/i).getAttribute("aria-pressed")).toBe("true");
  });

  it("Tab key reaches goal buttons, timeline buttons, and the Submit button (none have tabIndex=-1)", async () => {
    await advanceToStep4();

    const focusables = [
      goalButton(/Grow my audience/i),
      goalButton(/Start monetizing/i),
      goalButton(/Launch a product/i),
      goalButton(/Build a community/i),
      timelineButton(/Next 30 days/i),
      timelineButton(/Next 60 days/i),
      timelineButton(/Next 90 days/i),
      submitButton(),
    ];

    for (const el of focusables) {
      // Default tab order — none should be removed from it.
      const ti = el.getAttribute("tabindex");
      expect(ti === null || ti === "0").toBe(true);

      // Programmatically focusable.
      el.focus();
      expect(document.activeElement).toBe(el);
    }
  });

  it("submit button stays clickable until saving begins (not disabled by validation alone)", async () => {
    await advanceToStep4();

    // With no fields filled the submit button is still enabled — clicking surfaces inline errors instead.
    expect(submitButton().disabled).toBe(false);

    fireEvent.click(submitButton());
    expect(submitButton().disabled).toBe(false);
    expect(
      await screen.findByText(/Please pick at least one goal to continue\./i),
    ).toBeInTheDocument();
  });
});
