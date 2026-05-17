import { describe, it, expect } from "vitest";
import { isKnownRoute, safeNavPath } from "@/lib/routeRegistry";

describe("routeRegistry", () => {
  it("accepts top-level known routes", () => {
    expect(isKnownRoute("/dashboard")).toBe(true);
    expect(isKnownRoute("/social/friends")).toBe(true);
    expect(isKnownRoute("/wallet")).toBe(true);
  });

  it("accepts parameterized routes", () => {
    expect(isKnownRoute("/community/abc-123")).toBe(true);
    expect(isKnownRoute("/community/abc-123/tab")).toBe(true);
    expect(isKnownRoute("/@cool-handle")).toBe(true);
    expect(isKnownRoute("/music/artist/xyz/edit")).toBe(true);
  });

  it("strips query and hash", () => {
    expect(isKnownRoute("/dashboard?ref=foo")).toBe(true);
    expect(isKnownRoute("/dashboard#section")).toBe(true);
  });

  it("rejects bogus paths", () => {
    expect(isKnownRoute("/definitely-not-a-route")).toBe(false);
    expect(isKnownRoute("/social/banana")).toBe(false);
  });

  it("treats empty/sentinel paths as known no-ops", () => {
    expect(isKnownRoute("")).toBe(true);
    expect(isKnownRoute(null)).toBe(true);
    expect(isKnownRoute("__space__")).toBe(true);
  });

  it("safeNavPath falls back when unknown", () => {
    expect(safeNavPath("/dashboard")).toBe("/dashboard");
    expect(safeNavPath("/nope")).toBe("/dashboard");
    expect(safeNavPath("/nope", "/auth")).toBe("/auth");
  });
});
