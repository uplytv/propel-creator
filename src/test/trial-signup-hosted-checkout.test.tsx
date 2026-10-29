import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const invoke = vi.fn();
const from = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "fan@example.com", user_metadata: {} },
    loading: false,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => from(...args),
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

vi.mock("@/lib/posthog", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/affiliateCookies", () => ({
  getAffiliateCookie: () => null,
}));

vi.mock("sonner", () => ({
  toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

import TrialSignupModal from "@/components/pricing/TrialSignupModal";

function profileChain(displayName: string | null) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = self;
  chain.update = self;
  chain.eq = self;
  chain.maybeSingle = async () => ({ data: displayName ? { display_name: displayName } : null, error: null });
  return chain;
}

function renderModal() {
  return render(
    <MemoryRouter>
      <TrialSignupModal open onOpenChange={() => {}} defaultPlan="starter" />
    </MemoryRouter>
  );
}

describe("TrialSignupModal hosted checkout", () => {
  const assign = vi.fn();

  beforeEach(() => {
    invoke.mockReset();
    from.mockReset();
    assign.mockReset();
    from.mockImplementation(() => profileChain("Already Set"));
    vi.stubGlobal("location", { ...window.location, assign, origin: "http://localhost:8080" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function reachStep2() {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByLabelText("Full name"), "Ada Creator");
    await user.click(screen.getByRole("button", { name: /go to step 2/i }));
    expect(await screen.findByRole("button", { name: /continue to checkout/i })).toBeDisabled();
    return user;
  }

  it("redirects to the hosted Checkout URL and does not request embedded mode", async () => {
    invoke.mockResolvedValue({
      data: { url: "https://checkout.stripe.com/c/pay/cs_test_hosted" },
      error: null,
    });
    const user = await reachStep2();
    await user.click(screen.getByRole("checkbox"));
    const button = screen.getByRole("button", { name: /continue to checkout/i });
    expect(button).toBeEnabled();
    await user.click(button);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledTimes(1);
    });
    const [fn, opts] = invoke.mock.calls[0];
    expect(fn).toBe("create-platform-checkout");
    expect(opts.body.trial).toBe(true);
    expect(opts.body.plan).toBe("starter");
    expect(opts.body.embedded).toBeUndefined();
    expect(opts.body.email).toBe("fan@example.com");
    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay/cs_test_hosted");
    });
  });

  it("does not navigate when the function returns an embedded secret and no url", async () => {
    invoke.mockResolvedValue({
      data: { client_secret: "cs_test_secret_only" },
      error: null,
    });
    const user = await reachStep2();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /continue to checkout/i }));
    expect(await screen.findByText(/no checkout url returned/i)).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it("refuses a non-Stripe url", async () => {
    invoke.mockResolvedValue({
      data: { url: "https://evil.example/phish" },
      error: null,
    });
    const user = await reachStep2();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /continue to checkout/i }));
    expect(await screen.findByText(/no checkout url returned/i)).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it("returns an already-subscribed email to step 1 and does not navigate", async () => {
    invoke.mockResolvedValue({ data: { error: "already_subscribed" }, error: null });
    const user = await reachStep2();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /continue to checkout/i }));
    expect(await screen.findByRole("button", { name: /go to step 2/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /continue to checkout/i })).not.toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });
});
