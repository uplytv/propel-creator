/**
 * End-to-end keyboard nav: a user should be able to Tab from one results
 * view's follow button to the other view's button, activate either with
 * Enter or Space, and see the focus-visible ring remain on whichever
 * button currently holds focus.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CuratedFollowButton from "@/components/CuratedFollowButton";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

function TwoViews() {
  return (
    <div>
      {/* Stand-in for the main Search page result row */}
      <section aria-label="Search results">
        <CuratedFollowButton followKey="aryaxo" displayName="Arya XO" />
      </section>
      {/* Stand-in for the global useSearchEngine result row */}
      <section aria-label="Global engine results">
        <CuratedFollowButton followKey="aryaxo" displayName="Arya XO" />
      </section>
    </div>
  );
}

const FOCUS_RING = /focus-visible:ring-2/;

describe("Follow button keyboard nav across both views", () => {
  beforeEach(() => window.localStorage.clear());

  it("Tab moves focus from the Search button to the engine button", async () => {
    const user = userEvent.setup();
    render(<TwoViews />);
    const [searchBtn, engineBtn] = screen.getAllByRole("button");

    await user.tab();
    expect(searchBtn).toHaveFocus();
    expect(searchBtn.className).toMatch(FOCUS_RING);

    await user.tab();
    expect(engineBtn).toHaveFocus();
    expect(engineBtn.className).toMatch(FOCUS_RING);
  });

  it("Enter activates the focused Search button and syncs the engine button", async () => {
    const user = userEvent.setup();
    render(<TwoViews />);
    const [searchBtn, engineBtn] = screen.getAllByRole("button");

    await user.tab();
    expect(searchBtn).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(searchBtn).toHaveAttribute("aria-pressed", "true");
    expect(engineBtn).toHaveAttribute("aria-pressed", "true");
    // Focus stays on the activated button, ring class remains applied.
    expect(searchBtn).toHaveFocus();
    expect(searchBtn.className).toMatch(FOCUS_RING);
  });

  it("Space activates the focused engine button and syncs the Search button", async () => {
    const user = userEvent.setup();
    render(<TwoViews />);
    const [searchBtn, engineBtn] = screen.getAllByRole("button");

    await user.tab();
    await user.tab();
    expect(engineBtn).toHaveFocus();
    await user.keyboard(" "); // Space

    expect(engineBtn).toHaveAttribute("aria-pressed", "true");
    expect(searchBtn).toHaveAttribute("aria-pressed", "true");
    expect(engineBtn).toHaveFocus();
    expect(engineBtn.className).toMatch(FOCUS_RING);
  });

  it("Shift+Tab walks focus back to the Search button with the ring intact", async () => {
    const user = userEvent.setup();
    render(<TwoViews />);
    const [searchBtn, engineBtn] = screen.getAllByRole("button");

    await user.tab();
    await user.tab();
    expect(engineBtn).toHaveFocus();

    await user.tab({ shift: true });
    expect(searchBtn).toHaveFocus();
    expect(searchBtn.className).toMatch(FOCUS_RING);
  });
});
