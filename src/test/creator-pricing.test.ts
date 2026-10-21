import { describe, it, expect, vi, afterEach } from "vitest";
import { getPlatformFeeRate, getCreatorPlatformFeeRate } from "../../supabase/functions/_shared/platformFees";
import { creatorPriceVariable } from "../../supabase/functions/_shared/creatorPrices";
import { PLATFORM_PLANS, includesUplyBuild, planDisplayName } from "@/components/pricing/plans";
import { monthlyPlatformCost, COMPETITOR_PRICING } from "@/components/pricing/competitorPricing";
import { calculateNetAmount } from "@/lib/fees";

afterEach(() => vi.unstubAllGlobals());
describe("Creator pricing rules", () => {
  it("Free costs $0 monthly and charges 3% when enabled", () => {
    expect(PLATFORM_PLANS.find(p => p.key === "free")?.price).toBe(0);
    expect(getPlatformFeeRate("free", true)).toBe(0.03);
  });
  it("Pro costs $99 monthly and $990 annual with zero UPLY fees", () => {
    expect(PLATFORM_PLANS.find(p => p.key === "pro")).toMatchObject({ price: 99, annualPrice: 990, popular: true });
    expect(getPlatformFeeRate("pro", true)).toBe(0);
  });
  it("Studio costs $249 monthly and $2490 annual with zero UPLY fees", () => {
    expect(PLATFORM_PLANS.find(p => p.key === "studio")).toMatchObject({ price: 249, annualPrice: 2490 });
    expect(getPlatformFeeRate("studio", true)).toBe(0);
  });
  it("Annual Pro and Studio each bill ten monthly payments", () => {
    for (const p of PLATFORM_PLANS.filter(p => p.key !== "free")) expect(p.annualPrice).toBe(p.price * 10);
  });
  it("UPLY Build is included only with annual Studio", () => {
    expect(includesUplyBuild("studio", "annual")).toBe(true);
    expect(includesUplyBuild("studio", "monthly")).toBe(false);
    expect(includesUplyBuild("pro", "annual")).toBe(false);
    expect(includesUplyBuild("free", "annual")).toBe(false);
  });
  it("Disabled fees preserve 5% for every plan and perform no lookup", async () => {
    const from = vi.fn(() => { throw new Error("must not query"); });
    for (const plan of ["free", "pro", "studio", "starter", "unlimited", "agency_pro"]) expect(getPlatformFeeRate(plan)).toBe(0.05);
    expect(await getCreatorPlatformFeeRate({ from }, "creator")).toBe(0.05);
    expect(from).not.toHaveBeenCalled();
    expect(await getCreatorPlatformFeeRate({ from }, "creator", 0.12)).toBe(0.12);
  });
  it("Legacy display mapping does not confer new zero-fee entitlements", () => {
    expect(planDisplayName("agency_pro")).toContain("Studio equivalent");
    expect(getPlatformFeeRate("agency_pro", true)).toBe(0.05);
    expect(getPlatformFeeRate("unlimited", true)).toBe(0.05);
  });
  it("Enabled lookup uses trusted active creator plan and fails on schema errors", async () => {
    vi.stubGlobal("Deno", { env: { get: () => "true" } });
    const result = { data: { plan: "pro", status: "active" }, error: null as unknown };
    const client = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => result }) }) }) };
    expect(await getCreatorPlatformFeeRate(client, "creator")).toBe(0);
    result.data.status = "canceled";
    expect(await getCreatorPlatformFeeRate(client, "creator")).toBe(0.03);
    result.error = new Error("missing table");
    await expect(getCreatorPlatformFeeRate(client, "creator")).rejects.toThrow("lookup failed");
    await expect(getCreatorPlatformFeeRate(client, null)).rejects.toThrow("identity required");
  });
  it("Maps only new valid plans and billing intervals to required price variables", () => {
    expect(creatorPriceVariable("pro", "monthly")).toBe("STRIPE_PRICE_PRO_MONTHLY");
    expect(creatorPriceVariable("pro", "annual")).toBe("STRIPE_PRICE_PRO_ANNUAL");
    expect(creatorPriceVariable("studio", "monthly")).toBe("STRIPE_PRICE_STUDIO_MONTHLY");
    expect(creatorPriceVariable("studio", "annual")).toBe("STRIPE_PRICE_STUDIO_ANNUAL");
    expect(creatorPriceVariable("studio", "weekly")).toBeNull();
    expect(creatorPriceVariable("agency_pro", "monthly")).toBeNull();
  });
  it("Calculates monthly subscription plus sale fees excluding processing", () => {
    expect(monthlyPlatformCost(5000, 0, 0.03)).toBe(150);
    expect(monthlyPlatformCost(5000, 99, 0)).toBe(99);
    expect(monthlyPlatformCost(5000, 249, 0)).toBe(249);
    expect(monthlyPlatformCost(-10, 99, 0.03)).toBe(99);
    expect(calculateNetAmount(100, "tip", "free", true).net).toBe(97);
    expect(calculateNetAmount(100, "tip", "pro", true).net).toBe(100);
  });
  it("Does not fabricate processing-excluded Skool or Whop rates", () => {
    expect(COMPETITOR_PRICING.filter(p => p.name.startsWith("Skool") || p.name.startsWith("Whop")).map(p => p.platformRate)).toEqual([null, null, null]);
  });
});