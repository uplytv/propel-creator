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

// Replace Radix Select with a deterministic native <select>
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

// Same expected order as in Onboarding.tsx CREATOR_TYPES (3-column grid)
const ORDER = [
  "Fitness", "Finance", "Gaming",
  "Lifestyle", "Business", "Education",
  "Music", "Cooking", "Sports",
  "Beauty", "Travel", "Tech",
  "Real Estate", "IRL", "Other",
];

function advanceFromSplash() {
  vi.useFakeTimers();
  const utils = render(<Onboarding />);
  act(() => {
    vi.advanceTimersByTime(1600);
  });
  vi.useRealTimers();
  return utils;
}

function clickContinue() {
  const btn = screen
    .getAllByRole("button", { name: /Continue/i })
    .find((b) => !(b as HTMLButtonElement).disabled);
  if (!btn) throw new Error("No enabled Continue button found");
  fireEvent.click(btn);
}

function gotoStep2() {
  advanceFromSplash();
  const nameInput = screen.getByPlaceholderText(/Full name/i);
  fireEvent.change(nameInput, { target: { value: "Jane Doe" } });
  clickContinue();
}

function getCard(name: string) {
  return screen.getByRole("radio", { name: new RegExp(`^${name}$`, "i") }) as HTMLButtonElement;
}

describe("Onboarding Step 2 — creator-type cards keyboard navigation", () => {
  it("Tab enters the radiogroup at the first card when none is selected", async () => {
    const user = userEvent.setup();
    gotoStep2();

    const first = getCard(ORDER[0]);
    const others = ORDER.slice(1).map(getCard);

    // Roving tabindex: only first card is in the tab order initially
    expect(first.tabIndex).toBe(0);
    for (const c of others) expect(c.tabIndex).toBe(-1);

    // Tabbing from body should land on the first card eventually.
    // Focus it directly (jsdom Tab traversal across many elements is brittle),
    // then assert it's focusable as the single tab stop.
    first.focus();
    expect(document.activeElement).toBe(first);
  });

  it("ArrowRight / ArrowLeft move focus and selection horizontally with wrap", async () => {
    const user = userEvent.setup();
    gotoStep2();

    const first = getCard(ORDER[0]); // Fitness
    first.focus();

    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(getCard(ORDER[1])); // Finance
    expect(getCard(ORDER[1])).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(getCard(ORDER[0])); // Fitness
    expect(getCard(ORDER[0])).toHaveAttribute("aria-checked", "true");

    // ArrowLeft from index 0 wraps to last
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(getCard(ORDER[ORDER.length - 1])); // Other
  });

  it("ArrowDown / ArrowUp move focus by row (3 columns)", async () => {
    const user = userEvent.setup();
    gotoStep2();

    const first = getCard(ORDER[0]); // index 0 (Fitness)
    first.focus();

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(getCard(ORDER[3])); // Lifestyle (idx 3)

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(getCard(ORDER[6])); // Music (idx 6)

    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(getCard(ORDER[3])); // Lifestyle (idx 3)
  });

  it("Home jumps to the first card and End jumps to the last", async () => {
    const user = userEvent.setup();
    gotoStep2();

    const middle = getCard(ORDER[7]); // Cooking
    middle.focus();
    // Selecting via focus shift requires an arrow key; use End/Home directly.
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(getCard(ORDER[ORDER.length - 1]));
    expect(getCard(ORDER[ORDER.length - 1])).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(getCard(ORDER[0]));
    expect(getCard(ORDER[0])).toHaveAttribute("aria-checked", "true");
  });

  it("Enter and Space confirm selection on the focused card", async () => {
    const user = userEvent.setup();
    gotoStep2();

    const target = getCard("Tech");
    target.focus();

    await user.keyboard("{Enter}");
    expect(getCard("Tech")).toHaveAttribute("aria-checked", "true");

    // Move focus to a different card and select it with Space
    const other = getCard("Music");
    other.focus();
    await user.keyboard(" ");
    expect(getCard("Music")).toHaveAttribute("aria-checked", "true");
    expect(getCard("Tech")).toHaveAttribute("aria-checked", "false");
  });

  it("after a selection, only the selected card is in the tab order (roving tabindex)", async () => {
    const user = userEvent.setup();
    gotoStep2();

    const target = getCard("Beauty");
    target.focus();
    await user.keyboard("{Enter}");

    expect(getCard("Beauty").tabIndex).toBe(0);
    for (const v of ORDER.filter((v) => v !== "Beauty")) {
      expect(getCard(v).tabIndex).toBe(-1);
    }
  });

  it("enables the Continue button only after a card is selected via keyboard", async () => {
    const user = userEvent.setup();
    gotoStep2();

    // Continue is disabled before any selection
    const continueBefore = screen
      .getAllByRole("button", { name: /Continue/i })
      .find((b) => (b as HTMLButtonElement).disabled);
    expect(continueBefore).toBeTruthy();

    // Select via keyboard
    getCard(ORDER[0]).focus();
    await user.keyboard("{Enter}");

    // Continue is now enabled
    const continueAfter = screen
      .getAllByRole("button", { name: /Continue/i })
      .find((b) => !(b as HTMLButtonElement).disabled);
    expect(continueAfter).toBeTruthy();
  });
});
