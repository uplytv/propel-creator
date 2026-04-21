import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
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
  const SelectCtx = React.createContext<{
    value: string;
    onValueChange: (v: string) => void;
  }>({ value: "", onValueChange: () => {} });

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

async function advanceToStep3() {
  renderOnboarding();
  fillStep1();
  fillStep2();
  await screen.findByText(/Where are you right now\?/i);
}

function getStageRadios() {
  const group = screen.getByRole("radiogroup", { name: /creator stage/i });
  return within(group).getAllByRole("radio");
}

function getStage(name: RegExp) {
  const group = screen.getByRole("radiogroup", { name: /creator stage/i });
  return within(group).getByRole("radio", { name });
}

describe("Onboarding Step 3 — creator-stage mouse interaction", () => {
  it("selects a card on click and reflects aria-checked state", async () => {
    await advanceToStep3();

    const exploring = getStage(/Just exploring/i);
    expect(exploring.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(exploring);

    expect(exploring.getAttribute("aria-checked")).toBe("true");
    // Other radios remain unchecked.
    for (const r of getStageRadios()) {
      if (r !== exploring) {
        expect(r.getAttribute("aria-checked")).toBe("false");
      }
    }
  });

  it("switches selection when a different card is clicked", async () => {
    await advanceToStep3();

    const exploring = getStage(/Just exploring/i);
    const scaling = getStage(/Scaling a business/i);

    fireEvent.click(exploring);
    expect(exploring.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(scaling);
    expect(scaling.getAttribute("aria-checked")).toBe("true");
    expect(exploring.getAttribute("aria-checked")).toBe("false");
  });

  it("moves the roving tabIndex to the clicked card so keyboard focus follows the mouse", async () => {
    await advanceToStep3();

    const radios = getStageRadios();
    // Initial roving tab stop: first card (none selected yet).
    expect(radios[0].getAttribute("tabindex")).toBe("0");
    for (let i = 1; i < radios.length; i++) {
      expect(radios[i].getAttribute("tabindex")).toBe("-1");
    }

    // Click the third card.
    const earning = getStage(/Earning consistently/i);
    fireEvent.click(earning);

    // Now the clicked (selected) card is the sole tab stop.
    const updated = getStageRadios();
    for (const r of updated) {
      if (r === earning) {
        expect(r.getAttribute("tabindex")).toBe("0");
      } else {
        expect(r.getAttribute("tabindex")).toBe("-1");
      }
    }
  });

  it("clears the required-field error when a card is clicked after a failed submit", async () => {
    await advanceToStep3();

    // Enable Continue by filling the required textarea, then submit without a stage.
    const textarea = screen.getByPlaceholderText(/I teach first-generation investors/i);
    fireEvent.change(textarea, { target: { value: "I teach beginners." } });
    clickContinue();

    expect(
      await screen.findByText(/Please select where you are right now to continue\./i),
    ).toBeInTheDocument();

    // Click resolves the error.
    fireEvent.click(getStage(/Building momentum/i));

    expect(
      screen.queryByText(/Please select where you are right now to continue\./i),
    ).not.toBeInTheDocument();
  });
});
