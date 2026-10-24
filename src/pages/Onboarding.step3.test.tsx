import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import type { ReactNode } from "react";

// --- Mocks ---
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

// Replace Radix Select with a deterministic native <select> so tests can drive
// it via fireEvent.change without any pointer/portal gymnastics.
vi.mock("@/components/ui/select", () => {
  const React = require("react") as typeof import("react");

  const SelectCtx = React.createContext<{
    value: string;
    onValueChange: (v: string) => void;
  }>({ value: "", onValueChange: () => {} });

  const Select = ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: ReactNode;
  }) => {
    // Collect <SelectItem> values from descendants by rendering them once
    // inside a hidden native <select> for deterministic interaction.
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
      <SelectCtx.Provider value={{ value, onValueChange }}>
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
      </SelectCtx.Provider>
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

// Force iPhone width
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

// --- Deterministic step-advance helpers ---

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
  // The visible Continue button on the active step (only one step renders at a time)
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
  // First mocked native select on Step 2 is "What type of creator are you?"
  const selects = screen.getAllByTestId("mock-select");
  fireEvent.change(selects[0], { target: { value: creatorType } });
  clickContinue();
}

async function advanceToStep3() {
  renderOnboarding();
  fillStep1();
  fillStep2();
  // Wait for Step 3 heading to confirm we're there
  await screen.findByText(/Where are you right now\?/i);
}

describe("Onboarding Step 3 — iPhone layout", () => {
  it("renders all 4 stage cards inside a scrollable container with max-h-[55vh] and overflow-y-auto", async () => {
    await advanceToStep3();

    const titles = [
      "Just Starting Out",
      "Early Traction",
      "Growing",
      "Scaling",
    ];
    for (const t of titles) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }

    const firstOption = screen.getByText("Just Starting Out").closest("button");
    expect(firstOption).not.toBeNull();
    const container = firstOption!.parentElement!;
    expect(container.className).toContain("overflow-y-auto");
    expect(container.className).toContain("max-h-[55vh]");

    const buttons = within(container as HTMLElement).getAllByRole("button");
    expect(buttons.length).toBe(4);
  });
});
