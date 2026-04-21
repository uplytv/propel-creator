import { describe, it, expect } from "vitest";
import { parseFilter, parseSort, parseQuery } from "./filters";

describe("Achievements URL param validation", () => {
  describe("parseFilter", () => {
    it("returns valid filter values unchanged", () => {
      expect(parseFilter("all")).toBe("all");
      expect(parseFilter("kpi")).toBe("kpi");
      expect(parseFilter("onboarding")).toBe("onboarding");
    });

    it("falls back to 'all' for invalid values", () => {
      expect(parseFilter("hacker")).toBe("all");
      expect(parseFilter("")).toBe("all");
      expect(parseFilter("KPI")).toBe("all");
      expect(parseFilter("<script>")).toBe("all");
    });

    it("falls back to 'all' for null/undefined", () => {
      expect(parseFilter(null)).toBe("all");
      expect(parseFilter(undefined)).toBe("all");
    });
  });

  describe("parseSort", () => {
    it("returns valid sort values unchanged", () => {
      expect(parseSort("newest")).toBe("newest");
      expect(parseSort("oldest")).toBe("oldest");
      expect(parseSort("label")).toBe("label");
    });

    it("falls back to 'newest' for invalid values", () => {
      expect(parseSort("random")).toBe("newest");
      expect(parseSort("")).toBe("newest");
      expect(parseSort("Newest")).toBe("newest");
    });

    it("falls back to 'newest' for null/undefined", () => {
      expect(parseSort(null)).toBe("newest");
      expect(parseSort(undefined)).toBe("newest");
    });
  });

  describe("parseQuery", () => {
    it("returns empty string for null/undefined", () => {
      expect(parseQuery(null)).toBe("");
      expect(parseQuery(undefined)).toBe("");
    });

    it("caps query length at 100 chars", () => {
      const long = "a".repeat(500);
      expect(parseQuery(long)).toHaveLength(100);
    });

    it("preserves short queries", () => {
      expect(parseQuery("hello")).toBe("hello");
    });
  });
});
