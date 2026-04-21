import { describe, it, expect } from "vitest";
import {
  parseFilter,
  parseSort,
  parseQuery,
  parsePage,
  parsePageSize,
  DEFAULT_PAGE_SIZE,
} from "./filters";

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

  describe("parsePageSize", () => {
    it("accepts valid page sizes", () => {
      expect(parsePageSize("10")).toBe(10);
      expect(parsePageSize("25")).toBe(25);
      expect(parsePageSize("50")).toBe(50);
      expect(parsePageSize("100")).toBe(100);
    });

    it("falls back to default for invalid values", () => {
      expect(parsePageSize("7")).toBe(DEFAULT_PAGE_SIZE);
      expect(parsePageSize("abc")).toBe(DEFAULT_PAGE_SIZE);
      expect(parsePageSize("")).toBe(DEFAULT_PAGE_SIZE);
      expect(parsePageSize(null)).toBe(DEFAULT_PAGE_SIZE);
      expect(parsePageSize(undefined)).toBe(DEFAULT_PAGE_SIZE);
      expect(parsePageSize("-10")).toBe(DEFAULT_PAGE_SIZE);
    });
  });

  describe("parsePage", () => {
    it("returns valid page numbers", () => {
      expect(parsePage("1", 100, 10)).toBe(1);
      expect(parsePage("5", 100, 10)).toBe(5);
      expect(parsePage("10", 100, 10)).toBe(10);
    });

    it("clamps to last page when above max", () => {
      expect(parsePage("99", 50, 10)).toBe(5);
      expect(parsePage("1000", 25, 10)).toBe(3);
    });

    it("falls back to 1 for invalid values", () => {
      expect(parsePage("0", 100, 10)).toBe(1);
      expect(parsePage("-3", 100, 10)).toBe(1);
      expect(parsePage("abc", 100, 10)).toBe(1);
      expect(parsePage("1.5", 100, 10)).toBe(1);
      expect(parsePage(null, 100, 10)).toBe(1);
      expect(parsePage(undefined, 100, 10)).toBe(1);
    });

    it("returns 1 when there are no items", () => {
      expect(parsePage("5", 0, 10)).toBe(1);
    });
  });
});
