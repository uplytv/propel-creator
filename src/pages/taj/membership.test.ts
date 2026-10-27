import { describe, expect, it } from "vitest";
import { LESSON_COUNT, MEMBERSHIP, MODULES } from "./content";

describe("Taj club membership label", () => {
  it("shows the quoted club amount without a billing cadence", () => {
    expect(MEMBERSHIP.display).toBe("Club membership · $1,500");
    expect(MEMBERSHIP.priceLabel).toBe("$1,500");
    expect(MEMBERSHIP.display).not.toMatch(/\/mo|\/yr|month|annual/i);
    expect(MEMBERSHIP.note.toLowerCase()).not.toContain("per month");
  });

  it("publishes a browsable classroom", () => {
    expect(MODULES.length).toBeGreaterThanOrEqual(5);
    expect(LESSON_COUNT).toBeGreaterThanOrEqual(12);
    for (const mod of MODULES) {
      expect(mod.lessons.length).toBeGreaterThan(0);
      for (const lesson of mod.lessons) {
        expect(lesson.paragraphs.join(" ").length).toBeGreaterThan(40);
      }
    }
  });
});
