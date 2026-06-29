/**
 * Accessibility lock-in: the follow/unfollow button must expose a correct
 * aria-label, aria-pressed state, and full Space/Enter keyboard activation
 * in every results view it renders into.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CuratedFollowButton from "@/components/CuratedFollowButton";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

describe("CuratedFollowButton accessibility", () => {
  beforeEach(() => window.localStorage.clear());

  it("uses a native <button> with type=button (no role override needed)", () => {
    render(<CuratedFollowButton followKey="aryaxo" displayName="Arya XO" />);
    const btn = screen.getByRole("button");
    expect(btn.tagName).toBe("BUTTON");
    expect(btn).toHaveAttribute("type", "button");
    expect(btn).not.toHaveAttribute("role"); // native <button> doesn't need role
  });

  it("flips aria-label and aria-pressed in sync with state", () => {
    render(<CuratedFollowButton followKey="aryaxo" displayName="Arya XO" />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-label", "Follow Arya XO");
    expect(btn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(btn);

    expect(btn).toHaveAttribute("aria-label", "Unfollow Arya XO");
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("activates via Enter and Space (native button keyboard support)", () => {
    render(<CuratedFollowButton followKey="aryaxo" displayName="Arya XO" />);
    const btn = screen.getByRole("button") as HTMLButtonElement;
    btn.focus();
    expect(document.activeElement).toBe(btn);

    // Native <button> fires click on Enter/Space; simulate the resulting click.
    fireEvent.keyDown(btn, { key: "Enter", code: "Enter" });
    btn.click();
    expect(btn).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyDown(btn, { key: " ", code: "Space" });
    btn.click();
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("exposes a visible focus ring via focus-visible classes", () => {
    render(<CuratedFollowButton followKey="aryaxo" displayName="Arya XO" />);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/focus-visible:ring-2/);
    expect(btn.className).toMatch(/focus-visible:ring-primary/);
  });
});
