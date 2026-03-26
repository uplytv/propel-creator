import { describe, it, expect } from "vitest";
import { PLATFORM_FEES, calculateNetAmount } from "@/lib/fees";

describe("fees utility", () => {
  it("has expected fee types", () => {
    expect(PLATFORM_FEES.subscription).toBe(0.03);
    expect(PLATFORM_FEES.marketplace).toBe(0.10);
    expect(PLATFORM_FEES.tip).toBe(0.05);
    expect(PLATFORM_FEES.boost).toBe(0.00);
  });

  it("calculates subscription net correctly", () => {
    const result = calculateNetAmount(100, "subscription");
    expect(result.gross).toBe(100);
    expect(result.fee).toBe(3);
    expect(result.net).toBe(97);
  });

  it("calculates marketplace fee correctly", () => {
    const result = calculateNetAmount(200, "marketplace");
    expect(result.fee).toBe(20);
    expect(result.net).toBe(180);
  });

  it("handles zero amount", () => {
    const result = calculateNetAmount(0, "tip");
    expect(result.fee).toBe(0);
    expect(result.net).toBe(0);
  });

  it("fee + net = gross", () => {
    const result = calculateNetAmount(49.99, "subscription");
    expect(result.fee + result.net).toBeCloseTo(49.99, 2);
  });

  it("boost has zero fee", () => {
    const result = calculateNetAmount(500, "boost");
    expect(result.fee).toBe(0);
    expect(result.net).toBe(500);
  });
});
