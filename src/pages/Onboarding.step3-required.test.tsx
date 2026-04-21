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

const ERROR_TEXT = /Please select where you are right now to continue\./i;

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
  return continueBtn;
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

describe("Onboarding Step 3 — required creator stage validation", () => {
  it("does not show the required-field error before submit attempt", async () => {
    await advanceToStep3();
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument();
  });

  it("shows the required-field error when Continue is clicked without a stage selected", async () => {
    await advanceToStep3();

    // Fill the one-sentence textarea so the Continue button becomes enabled
    // (Continue is disabled while oneSentence is empty).
    const textarea = screen.getByPlaceholderText(/I teach first-generation investors/i);
    fireEvent.change(textarea, { target: { value: "I teach beginner investors." } });

    // Sanity: no error visible yet.
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument();

    clickContinue();

    // Error message appears with role="alert" and the exact copy.
    const error = await screen.findByText(ERROR_TEXT);
    expect(error).toBeInTheDocument();
    expect(error.getAttribute("role")).toBe("alert");
    expect(error.getAttribute("aria-live")).toBe("polite");

    // Still on Step 3 — the heading is still rendered.
    expect(screen.getByText(/Where are you right now\?/i)).toBeInTheDocument();
  });

  it("clears the error and advances once a stage is selected and Continue is clicked again", async () => {
    await advanceToStep3();

    const textarea = screen.getByPlaceholderText(/I teach first-generation investors/i);
    fireEvent.change(textarea, { target: { value: "I teach beginner investors." } });

    clickContinue();
    expect(await screen.findByText(ERROR_TEXT)).toBeInTheDocument();

    // Select a stage via the radiogroup.
    const radiogroup = screen.getByRole("radiogroup", { name: /creator stage/i });
    const exploring = within(radiogroup).getByRole("radio", { name: /Just exploring/i });
    fireEvent.click(exploring);

    // Error disappears as soon as a stage is chosen.
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument();

    // Continue advances to Step 4.
    clickContinue();
    expect(await screen.findByText(/Step 4 of 4/i)).toBeInTheDocument();
  });
});
