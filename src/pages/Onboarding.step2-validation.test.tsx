import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

const navigateMock = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user", email: "test@example.com" } }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
  return {
    supabase: {
      from: vi.fn(() => builder),
      rpc: vi.fn(async () => ({ data: null })),
      storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
      functions: { invoke: vi.fn(async () => ({ data: null })) },
    },
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), message: vi.fn(), info: vi.fn(), warning: vi.fn() },
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
      <select data-testid="mock-select" value={value} onChange={(e) => onValueChange(e.target.value)}>
        <option value="" />
        {items.map((it) => (
          <option key={it.value} value={it.value}>
            {typeof it.label === "string" ? it.label : it.value}
          </option>
        ))}
      </select>
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
  window.sessionStorage.clear();
  navigateMock.mockClear();
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

function getContinueButton() {
  return screen
    .getAllByRole("button", { name: /Continue/i })
    .find((b) => !(b as HTMLButtonElement).disabled) as HTMLButtonElement | undefined;
}

function advanceToStep2() {
  renderOnboarding();
  const nameInput = screen.getByPlaceholderText(/Full name/i);
  fireEvent.change(nameInput, { target: { value: "Jane Doe" } });
  fireEvent.click(getContinueButton()!);
}

describe("Onboarding Step 2 — creator type validation", () => {
  it("does NOT show the error banner before the user attempts to continue", () => {
    advanceToStep2();
    expect(screen.getByText(/Your Creator Profile/i)).toBeInTheDocument();
    expect(screen.queryByTestId("creator-type-error")).not.toBeInTheDocument();
    expect(screen.queryByText(/Creator type required/i)).not.toBeInTheDocument();
  });

  it("shows the 'Creator type required' error banner when Continue is clicked with no creator type selected", () => {
    advanceToStep2();
    const continueBtn = getContinueButton();
    expect(continueBtn).toBeDefined();
    fireEvent.click(continueBtn!);

    const banner = screen.getByTestId("creator-type-error");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute("role", "alert");
    expect(screen.getByText(/Creator type required/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Please select a creator type below before continuing/i),
    ).toBeInTheDocument();

    // Should NOT advance to Step 3
    expect(screen.queryByText(/Where are you right now\?/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Your Creator Profile/i)).toBeInTheDocument();
  });

  it("marks the creator-type radiogroup as aria-invalid when validation fails", () => {
    advanceToStep2();
    fireEvent.click(getContinueButton()!);
    const radiogroup = screen.getByRole("radiogroup", { name: /Creator type/i });
    expect(radiogroup).toHaveAttribute("aria-invalid", "true");
  });

  it("hides the error banner after selecting a creator type", () => {
    advanceToStep2();
    fireEvent.click(getContinueButton()!);
    expect(screen.getByTestId("creator-type-error")).toBeInTheDocument();

    const fitnessCard = screen.getByRole("radio", { name: /Fitness/i });
    fireEvent.click(fitnessCard);

    expect(screen.queryByTestId("creator-type-error")).not.toBeInTheDocument();
    expect(screen.queryByText(/Creator type required/i)).not.toBeInTheDocument();

    const radiogroup = screen.getByRole("radiogroup", { name: /Creator type/i });
    expect(radiogroup).not.toHaveAttribute("aria-invalid", "true");
  });

  it("advances to Step 3 after selecting a creator type and clicking Continue", () => {
    advanceToStep2();
    // First attempt: error
    fireEvent.click(getContinueButton()!);
    expect(screen.getByTestId("creator-type-error")).toBeInTheDocument();

    // Select and retry
    fireEvent.click(screen.getByRole("radio", { name: /Education/i }));
    fireEvent.click(getContinueButton()!);

    expect(screen.getByText(/Where are you right now\?/i)).toBeInTheDocument();
    expect(screen.queryByTestId("creator-type-error")).not.toBeInTheDocument();
  });

  it("scrolls the error banner into view on mobile when Continue is clicked with no creator type", () => {
    // Force a mobile viewport
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 844 });

    // Spy on scrollIntoView (not implemented in jsdom by default)
    const scrollSpy = vi.fn();
    const originalScrollIntoView = (window as any).HTMLElement.prototype.scrollIntoView;
    (window as any).HTMLElement.prototype.scrollIntoView = scrollSpy;

    // Stub requestAnimationFrame to queue callbacks; we'll flush them after React commits.
    const originalRaf = window.requestAnimationFrame;
    const rafQueue: FrameRequestCallback[] = [];
    const stubRaf = ((cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    }) as any;
    window.requestAnimationFrame = stubRaf;

    try {
      advanceToStep2();
      // Re-apply rAF stub in case the fake-timer cycle in advanceToStep2 replaced it.
      window.requestAnimationFrame = stubRaf;
      act(() => {
        fireEvent.click(getContinueButton()!);
      });

      // Now flush queued rAF callbacks — by this point React has committed
      // the state update and the ref is attached to the rendered banner.
      act(() => {
        while (rafQueue.length) rafQueue.shift()!(0);
      });

      const banner = screen.getByTestId("creator-type-error");
      expect(banner).toBeInTheDocument();

      // scrollIntoView should have been called on the banner's wrapper element
      expect(scrollSpy).toHaveBeenCalled();
      const callArg = scrollSpy.mock.calls[0][0];
      expect(callArg).toMatchObject({ behavior: "smooth", block: "center" });

      // Verify the call was made on an element that contains the banner (the ref'd wrapper)
      const calledOn = scrollSpy.mock.instances[0] as HTMLElement;
      expect(calledOn.contains(banner) || calledOn === banner).toBe(true);
    } finally {
      (window as any).HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
      window.requestAnimationFrame = originalRaf;
    }
  });

  it("triggers the error banner and scrolls it into view when Enter is pressed on the focused Continue button (mobile)", async () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 844 });

    const scrollSpy = vi.fn();
    const originalScrollIntoView = (window as any).HTMLElement.prototype.scrollIntoView;
    (window as any).HTMLElement.prototype.scrollIntoView = scrollSpy;

    const originalRaf = window.requestAnimationFrame;
    const rafQueue: FrameRequestCallback[] = [];
    const stubRaf = ((cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    }) as any;
    window.requestAnimationFrame = stubRaf;

    try {
      advanceToStep2();
      window.requestAnimationFrame = stubRaf;

      const continueBtn = getContinueButton()!;
      // user-event's keyboard simulation triggers the browser's native button
      // activation behavior (Enter on a focused <button> fires click).
      const user = userEvent.setup();
      continueBtn.focus();
      expect(document.activeElement).toBe(continueBtn);

      await act(async () => {
        await user.keyboard("{Enter}");
      });

      // Banner should now be in the DOM
      const banner = screen.getByTestId("creator-type-error");
      expect(banner).toBeInTheDocument();
      expect(screen.getByText(/Creator type required/i)).toBeInTheDocument();

      // Should NOT have advanced to Step 3
      expect(screen.queryByText(/Where are you right now\?/i)).not.toBeInTheDocument();

      // Flush queued rAF — scrollIntoView should fire on the ref'd wrapper
      act(() => {
        while (rafQueue.length) rafQueue.shift()!(0);
      });

      expect(scrollSpy).toHaveBeenCalled();
      expect(scrollSpy.mock.calls[0][0]).toMatchObject({ behavior: "smooth", block: "center" });
      const calledOn = scrollSpy.mock.instances[0] as HTMLElement;
      expect(calledOn.contains(banner) || calledOn === banner).toBe(true);
    } finally {
      (window as any).HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
      window.requestAnimationFrame = originalRaf;
    }
  });
});
