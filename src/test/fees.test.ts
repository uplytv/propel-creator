import { describe, it, expect } from "vitest";
import { platformFee, creatorNet, PLATFORM_FEE_PCT } from "@/lib/fees";

describe("fees utility", () => {
  it("exports a reasonable platform fee percentage", () => {
    expect(PLATFORM_FEE_PCT).toBeGreaterThan(0);
    expect(PLATFORM_FEE_PCT).toBeLessThan(1);
  });

  it("calculates platform fee correctly", () => {
    const fee = platformFee(100);
    expect(fee).toBeCloseTo(100 * PLATFORM_FEE_PCT, 2);
  });

  it("calculates creator net correctly", () => {
    const net = creatorNet(100);
    expect(net).toBeCloseTo(100 * (1 - PLATFORM_FEE_PCT), 2);
  });

  it("handles zero amount", () => {
    expect(platformFee(0)).toBe(0);
    expect(creatorNet(0)).toBe(0);
  });

  it("fee + net = original amount", () => {
    const amount = 49.99;
    expect(platformFee(amount) + creatorNet(amount)).toBeCloseTo(amount, 2);
  });
});
