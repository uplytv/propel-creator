/**
 * Visual regression tests for the Onboarding flow.
 *
 * Reuses the same mocking strategy as Onboarding.step3.test.tsx (auth, supabase,
 * sonner, framer-motion, Radix Select replaced with a native <select>). We
 * snapshot the splash screen and each interactive step's DOM so any drift in
 * layout, copy, classes, or step ordering shows up as a snapshot diff.
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { ReactNode } from "react";

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

  const Select = ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: ReactNode;
  }) => {
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

afterAll(() => {
  vi.useRealTimers();
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

import Onboarding from "@/pages/Onboarding";

function clickContinue() {
  const continueBtn = screen
    .getAllByRole("button", { name: /Continue/i })
    .find((b) => !(b as HTMLButtonElement).disabled);
  if (!continueBtn) throw new Error("No enabled Continue button found");
  fireEvent.click(continueBtn);
}

describe("Onboarding — visual regression (DOM snapshots)", () => {
  it("Splash screen matches snapshot", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { container } = render(<Onboarding />);
    // Don't advance past splash.
    expect(container.firstChild).toMatchSnapshot();
    vi.useRealTimers();
  });

  it("Step 1 (name) matches snapshot", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { container } = render(<Onboarding />);
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    vi.useRealTimers();
    expect(container.firstChild).toMatchSnapshot();
  });

  it("Step 2 (creator type) matches snapshot", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { container } = render(<Onboarding />);
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    vi.useRealTimers();
    fireEvent.change(screen.getByPlaceholderText(/Full name/i), {
      target: { value: "Jane Doe" },
    });
    clickContinue();
    expect(container.firstChild).toMatchSnapshot();
  });

  it("Step 3 (stage) matches snapshot", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { container } = render(<Onboarding />);
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    vi.useRealTimers();
    fireEvent.change(screen.getByPlaceholderText(/Full name/i), {
      target: { value: "Jane Doe" },
    });
    clickContinue();
    const selects = screen.getAllByTestId("mock-select");
    fireEvent.change(selects[0], { target: { value: "Fitness" } });
    clickContinue();
    expect(container.firstChild).toMatchSnapshot();
  });
});
