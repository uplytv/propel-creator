import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AryaXO from "@/pages/AryaXO";

describe("AryaXO profile — featured blog teaser", () => {
  it("renders the featured blog teaser linking to /arya-xo/blog", () => {
    render(
      <MemoryRouter initialEntries={["/arya-xo"]}>
        <AryaXO />
      </MemoryRouter>,
    );
    const teaser = screen.getByLabelText(
      /Read the feature: Twenty-two, and writing his own lane/i,
    ) as HTMLAnchorElement;
    expect(teaser).toBeInTheDocument();
    expect(teaser.getAttribute("href")).toBe("/arya-xo/blog");
    expect(
      screen.getByRole("heading", {
        name: /Twenty-two, and writing his own lane/i,
      }),
    ).toBeInTheDocument();
  });
});
