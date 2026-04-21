import { describe, it, expect } from "vitest";
import {
  parseFilter,
  parseSort,
  parseQuery,
  parsePage,
  parsePageSize,
  parseCursor,
  sliceByCursor,
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
      expect(parseQuery("a".repeat(500))).toHaveLength(100);
    });
  });

  describe("parsePageSize", () => {
    it("accepts valid page sizes", () => {
      expect(parsePageSize("10")).toBe(10);
      expect(parsePageSize("100")).toBe(100);
    });

    it("falls back to default for invalid values", () => {
      expect(parsePageSize("7")).toBe(DEFAULT_PAGE_SIZE);
      expect(parsePageSize("abc")).toBe(DEFAULT_PAGE_SIZE);
      expect(parsePageSize(null)).toBe(DEFAULT_PAGE_SIZE);
    });
  });

  describe("parsePage", () => {
    it("clamps to last page when above max", () => {
      expect(parsePage("99", 50, 10)).toBe(5);
    });

    it("falls back to 1 for invalid values", () => {
      expect(parsePage("0", 100, 10)).toBe(1);
      expect(parsePage("abc", 100, 10)).toBe(1);
      expect(parsePage(null, 100, 10)).toBe(1);
    });
  });

  describe("parseCursor", () => {
    it("accepts valid id-like strings", () => {
      expect(parseCursor("abc123")).toBe("abc123");
      expect(parseCursor("a_b-c-1")).toBe("a_b-c-1");
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      expect(parseCursor(uuid)).toBe(uuid);
    });

    it("rejects empty/null/undefined", () => {
      expect(parseCursor(null)).toBeNull();
      expect(parseCursor(undefined)).toBeNull();
      expect(parseCursor("")).toBeNull();
      expect(parseCursor("   ")).toBeNull();
    });

    it("rejects strings with disallowed chars", () => {
      expect(parseCursor("<script>")).toBeNull();
      expect(parseCursor("foo bar")).toBeNull();
      expect(parseCursor("foo/bar")).toBeNull();
    });

    it("rejects overly long strings", () => {
      expect(parseCursor("a".repeat(65))).toBeNull();
    });
  });

  describe("sliceByCursor", () => {
    const items = [
      { id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" },
    ];

    it("starts from beginning when cursor is null", () => {
      const r = sliceByCursor(items, null, 2);
      expect(r.items.map((i) => i.id)).toEqual(["a", "b"]);
      expect(r.nextCursor).toBe("c");
      expect(r.prevCursor).toBeNull();
    });

    it("slices from cursor position", () => {
      const r = sliceByCursor(items, "c", 2);
      expect(r.items.map((i) => i.id)).toEqual(["c", "d"]);
      expect(r.nextCursor).toBe("e");
      expect(r.prevCursor).toBe("a");
    });

    it("returns null nextCursor on last page", () => {
      const r = sliceByCursor(items, "e", 2);
      expect(r.items.map((i) => i.id)).toEqual(["e"]);
      expect(r.nextCursor).toBeNull();
    });

    it("falls back to start when cursor not found", () => {
      const r = sliceByCursor(items, "missing", 2);
      expect(r.items.map((i) => i.id)).toEqual(["a", "b"]);
      expect(r.startIndex).toBe(0);
    });

    it("is stable when new items are inserted before the cursor", () => {
      // Page 2 of original list (cursor='c', size=2) -> ['c','d']
      const before = sliceByCursor(items, "c", 2);
      // New items inserted at the top
      const updated = [{ id: "x" }, { id: "y" }, ...items];
      const after = sliceByCursor(updated, "c", 2);
      expect(after.items).toEqual(before.items);
    });
  });
});
