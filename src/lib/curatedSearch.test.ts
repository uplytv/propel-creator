import { describe, it, expect } from "vitest";
import { getCuratedResults } from "@/lib/curatedSearch";

describe("curated search — Arya XO discovery", () => {
  it.each([
    "arya",
    "aryaxo",
    "arya xo",
    "ARYA",
    "150 bands",
    "hugel",
    "youngboy",
  ])("surfaces Arya XO results for query %s", (term) => {
    const results = getCuratedResults(term);
    expect(results.length).toBeGreaterThan(0);
    // The artist card should always be first or near-first
    expect(results[0].link.startsWith("/arya-xo")).toBe(true);
  });

  it("includes the blog, website, links, and 150 Bands track for 'arya'", () => {
    const links = getCuratedResults("arya").map((r) => r.link);
    expect(links).toContain("/arya-xo-site");
    expect(links).toContain("/arya-xo");
    expect(links).toContain("/arya-xo/blog");
    expect(links).toContain("/arya-xo/blog/150-bands");
  });

  it("returns nothing for unrelated queries", () => {
    expect(getCuratedResults("pizza recipes")).toEqual([]);
    expect(getCuratedResults("")).toEqual([]);
  });
});
