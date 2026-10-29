import { describe, it, expect, vi } from "vitest";
import { LEGACY_PLATFORM_PLANS, canCheckoutPlan } from "@/components/pricing/plans";
import { withTrialTimeout, hostedCheckoutUrl } from "@/lib/trialCheckout";

describe("Production trial checkout", () => {
  it("Starter remains $97 per month", () => {
    expect(LEGACY_PLATFORM_PLANS.find(p => p.key === "starter")?.price).toBe(97);
    expect(canCheckoutPlan("starter")).toBe(true);
  });
  it("Unlimited remains $297 per month", () => {
    expect(LEGACY_PLATFORM_PLANS.find(p => p.key === "unlimited")?.price).toBe(297);
    expect(canCheckoutPlan("unlimited")).toBe(true);
  });
  it("redirects only to hosted Stripe Checkout", () => {
    expect(hostedCheckoutUrl("https://checkout.stripe.com/c/pay/test")).toBe("https://checkout.stripe.com/c/pay/test");
    expect(() => hostedCheckoutUrl("https://example.com/pay")).toThrow();
    expect(() => hostedCheckoutUrl(null)).toThrow();
  });
  it("stalled signup rejects rather than spinning forever", async () => {
    vi.useFakeTimers();
    const pending = withTrialTimeout(new Promise(() => {}), "Signup timed out", 25000);
    const assertion = expect(pending).rejects.toThrow("Signup timed out");
    await vi.advanceTimersByTimeAsync(25000);
    await assertion;
    vi.useRealTimers();
  });
  it("returns successful signup without waiting for the timeout", async () => {
    expect(await withTrialTimeout(Promise.resolve({ session: "ready" }), "timeout")).toEqual({ session: "ready" });
  });
});