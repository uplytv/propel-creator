import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

// --- Mocks (mirrors Onboarding.step3.test.tsx) ---
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user", email: "test@example.com" } }),
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
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
vi.mock("@/components/onboarding/MilestoneProgressPill", () => ({ default: () => null }));

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
  const SelectItem: any = ({ value, children }: any) => <div data-value={value}>{children}</div>;
  SelectItem.__isSelectItem = true;
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 390 });
  Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 844 });
  window.localStorage.clear();
});

import Onboarding from "./Onboarding";

// CREATOR_STAGES order in Onboarding.tsx
const STAGE_ORDER = ["exploring", "building", "earning", "scaling"];

function clickContinue() {
  const btn = screen
    .getAllByRole("button", { name: /Continue/i })
    .find((b) => !(b as HTMLButtonElement).disabled);
  if (!btn) throw new Error("No enabled Continue button found");
  fireEvent.click(btn);
}

function gotoStep3() {
  vi.useFakeTimers();
  render(<Onboarding />);
  act(() => {
    vi.advanceTimersByTime(1600);
  });
  vi.useRealTimers();

  // Step 1: name
  const nameInput = screen.getByPlaceholderText(/Full name/i);
  fireEvent.change(nameInput, { target: { value: "Jane Doe" } });
  clickContinue();

  // Step 2: pick a creator type via the card (radiogroup)
  const card = document.querySelector('[data-creator-type-card="Fitness"]') as HTMLButtonElement;
  fireEvent.click(card);
  clickContinue();
}

function getStageCard(key: string) {
  const el = document.querySelector(`[data-creator-stage-card="${key}"]`);
  if (!el) throw new Error(`Stage card not found for "${key}"`);
  return el as HTMLButtonElement;
}

describe("Onboarding Step 3 — creator-stage cards keyboard navigation", () => {
  it("Tab enters the radiogroup at the first card when none is selected", () => {
    gotoStep3();
    const first = getStageCard(STAGE_ORDER[0]);
    const others = STAGE_ORDER.slice(1).map(getStageCard);
    expect(first.tabIndex).toBe(0);
    for (const c of others) expect(c.tabIndex).toBe(-1);
    first.focus();
    expect(document.activeElement).toBe(first);
  });

  it("ArrowDown / ArrowUp move focus and selection vertically with wrap", async () => {
    const user = userEvent.setup();
    gotoStep3();

    getStageCard(STAGE_ORDER[0]).focus();

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(getStageCard(STAGE_ORDER[1]));
    expect(getStageCard(STAGE_ORDER[1])).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(getStageCard(STAGE_ORDER[2]));

    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(getStageCard(STAGE_ORDER[1]));

    // ArrowUp from index 0 wraps to last
    getStageCard(STAGE_ORDER[0]).focus();
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(getStageCard(STAGE_ORDER[STAGE_ORDER.length - 1]));
  });

  it("ArrowRight / ArrowLeft also navigate (cycle)", async () => {
    const user = userEvent.setup();
    gotoStep3();

    getStageCard(STAGE_ORDER[0]).focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(getStageCard(STAGE_ORDER[1]));

    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(getStageCard(STAGE_ORDER[0]));
  });

  it("Home jumps to the first card and End jumps to the last", async () => {
    const user = userEvent.setup();
    gotoStep3();

    getStageCard(STAGE_ORDER[1]).focus();
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(getStageCard(STAGE_ORDER[STAGE_ORDER.length - 1]));
    expect(getStageCard(STAGE_ORDER[STAGE_ORDER.length - 1])).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(getStageCard(STAGE_ORDER[0]));
    expect(getStageCard(STAGE_ORDER[0])).toHaveAttribute("aria-checked", "true");
  });

  it("Enter and Space confirm selection on the focused card", async () => {
    const user = userEvent.setup();
    gotoStep3();

    const earning = getStageCard("earning");
    earning.focus();
    await user.keyboard("{Enter}");
    expect(getStageCard("earning")).toHaveAttribute("aria-checked", "true");

    const scaling = getStageCard("scaling");
    scaling.focus();
    await user.keyboard(" ");
    expect(getStageCard("scaling")).toHaveAttribute("aria-checked", "true");
    expect(getStageCard("earning")).toHaveAttribute("aria-checked", "false");
  });

  it("after a selection, only the selected card is in the tab order (roving tabindex)", async () => {
    const user = userEvent.setup();
    gotoStep3();

    getStageCard("building").focus();
    await user.keyboard("{Enter}");

    expect(getStageCard("building").tabIndex).toBe(0);
    for (const k of STAGE_ORDER.filter((k) => k !== "building")) {
      expect(getStageCard(k).tabIndex).toBe(-1);
    }
  });
});
