import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";

// --- Mocks ---
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user", email: "test@example.com" } }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

const fromMock = () => ({
  select: () => ({
    eq: () => ({ single: async () => ({ data: null, error: null }), maybeSingle: async () => ({ data: null, error: null }) }),
  }),
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(fromMock),
    rpc: vi.fn(async () => ({ data: null })),
    storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
    functions: { invoke: vi.fn(async () => ({ data: null })) },
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() } }));

vi.mock("@/lib/affiliateCookies", () => ({
  getAffiliateCookie: () => null,
  clearAffiliateCookie: () => {},
  getReferralData: () => ({ code: null, username: null, name: null }),
  clearReferralData: () => {},
}));

vi.mock("@/lib/cooldownToast", () => ({ showCooldownToast: vi.fn() }));
vi.mock("@/hooks/useAutoRetryPreference", () => ({ useAutoRetryPreference: () => ({ enabled: false }) }));
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

// Force iPhone width
beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 390 });
  Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 844 });
  window.localStorage.clear();
});

import Onboarding from "./Onboarding";

async function advanceToStep3() {
  vi.useFakeTimers();
  render(<Onboarding />);
  // Splash auto-advances after 1500ms
  await act(async () => {
    vi.advanceTimersByTime(1600);
  });
  vi.useRealTimers();

  // Step 1: enter name then continue
  const nameInput = await screen.findByPlaceholderText(/Full name/i);
  fireEvent.change(nameInput, { target: { value: "Jane Doe" } });
  const step1Continue = screen.getAllByRole("button", { name: /Continue/i })[0];
  fireEvent.click(step1Continue);

  // Step 2: pick creator type via state by simulating direct continue is blocked; we set creator type by clicking trigger.
  // Simpler: skip Select interaction and just click Continue twice — Continue is disabled until creatorType is set.
  // Use the Select hidden trigger: click the "Fitness" item via opening the dropdown.
  const trigger = await screen.findByText(/Select category/i);
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  fireEvent.click(trigger);
  // Select content uses portals; try to find an option
  const fitness = await screen.findByText("Fitness", {}, { timeout: 2000 }).catch(() => null);
  if (fitness) fireEvent.click(fitness);

  const step2Continue = screen.getAllByRole("button", { name: /Continue/i })[0];
  fireEvent.click(step2Continue);
}

describe("Onboarding Step 3 — iPhone layout", () => {
  it("renders all 4 stage cards inside a scrollable container with max-h-[55vh] and overflow-y-auto", async () => {
    await advanceToStep3();

    // Step 3 heading
    expect(await screen.findByText(/Where are you right now\?/i)).toBeInTheDocument();

    // All 4 stage option titles
    const titles = ["Just exploring", "Building momentum", "Earning consistently", "Scaling a business"];
    for (const t of titles) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }

    // Container of the first option carries the scroll classes
    const firstOption = screen.getByText("Just exploring").closest("button");
    expect(firstOption).not.toBeNull();
    const container = firstOption!.parentElement!;
    expect(container.className).toContain("overflow-y-auto");
    expect(container.className).toContain("max-h-[55vh]");

    // All 4 buttons are in the same container
    const buttons = within(container as HTMLElement).getAllByRole("button");
    expect(buttons.length).toBe(4);
  });
});
