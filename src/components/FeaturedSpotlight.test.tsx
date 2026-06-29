import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FeaturedSpotlight, { FEATURED_ENTRIES } from "@/components/FeaturedSpotlight";

function renderAt(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FeaturedSpotlight />
    </MemoryRouter>,
  );
}

describe("FeaturedSpotlight", () => {
  it("renders the Arya XO blog feature with the right CTA link", () => {
    renderAt();
    expect(screen.getByText(/Featured on UPLY/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Twenty-two, and writing his own lane/i),
    ).toBeInTheDocument();
    const cta = screen.getByLabelText(/Read the feature/i) as HTMLAnchorElement;
    expect(cta.getAttribute("href")).toBe("/arya-xo/blog");
  });

  it("links to the artist's other surfaces (site, links, track)", () => {
    renderAt();
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => (a as HTMLAnchorElement).getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining(["/arya-xo/blog", "/arya-xo-site", "/arya-xo", "/arya-xo/blog/150-bands"]),
    );
  });

  it("exposes the featured entry as a curated data source", () => {
    expect(FEATURED_ENTRIES[0].href).toBe("/arya-xo/blog");
    expect(FEATURED_ENTRIES[0].related?.some((r) => r.href === "/arya-xo-site")).toBe(true);
    expect(FEATURED_ENTRIES[0].related?.some((r) => r.href === "/arya-xo")).toBe(true);
  });
});
