import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AryaXOBlog from "./AryaXOBlog";

const BLOG_PATHS = [
  "/arya-xo/blog",
  "/arya-xo-blog",
  "/arya-xo/blog/150-bands",
] as const;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/arya-xo/blog" element={<AryaXOBlog />} />
        <Route path="/arya-xo-blog" element={<AryaXOBlog />} />
        <Route path="/arya-xo/blog/150-bands" element={<AryaXOBlog />} />
        <Route path="*" element={<div data-testid="not-found">404</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Arya XO blog routes", () => {
  it.each(BLOG_PATHS)("resolves %s to the 150 Bands feature", (path) => {
    const { unmount } = renderAt(path);
    expect(screen.queryByTestId("not-found")).toBeNull();
    // Headline + record card markers unique to the blog post
    expect(
      screen.getByRole("heading", { level: 1, name: /writing his own lane/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /^150 bands$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Afro House · Latin House · Hip-Hop/i),
    ).toBeInTheDocument();
    unmount();
  });

  it("renders identical headline text across all blog paths", () => {
    const headlines = BLOG_PATHS.map((path) => {
      const { unmount } = renderAt(path);
      const h1 = screen.getByRole("heading", { level: 1 }).textContent ?? "";
      unmount();
      return h1;
    });
    expect(new Set(headlines).size).toBe(1);
  });
});
