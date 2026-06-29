/**
 * Cross-view sync: clicking follow/unfollow on one CuratedFollowButton
 * must instantly flip every other button bound to the same followKey,
 * regardless of which results view rendered it (main Search page vs the
 * global useSearchEngine results). Sync is driven by a `curated-follow-change`
 * custom event in-tab and the native `storage` event across tabs.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import CuratedFollowButton from "@/components/CuratedFollowButton";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

const KEY = "uply:curated-follow:aryaxo";

describe("CuratedFollowButton cross-view sync", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("flips a sibling button bound to the same followKey when clicked", () => {
    render(
      <>
        <CuratedFollowButton followKey="aryaxo" displayName="Arya XO" />
        <CuratedFollowButton followKey="aryaxo" displayName="Arya XO" />
      </>,
    );
    const [a, b] = screen.getAllByRole("button");
    expect(a).toHaveAttribute("aria-pressed", "false");
    expect(b).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(a);

    expect(a).toHaveAttribute("aria-pressed", "true");
    expect(b).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem(KEY)).toBe("1");

    fireEvent.click(b);
    expect(a).toHaveAttribute("aria-pressed", "false");
    expect(b).toHaveAttribute("aria-pressed", "false");
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("does not affect buttons bound to a different followKey", () => {
    render(
      <>
        <CuratedFollowButton followKey="aryaxo" displayName="Arya XO" />
        <CuratedFollowButton followKey="someoneelse" displayName="Other" />
      </>,
    );
    const [arya, other] = screen.getAllByRole("button");
    fireEvent.click(arya);
    expect(arya).toHaveAttribute("aria-pressed", "true");
    expect(other).toHaveAttribute("aria-pressed", "false");
  });

  it("syncs across tabs via the native storage event", () => {
    render(<CuratedFollowButton followKey="aryaxo" displayName="Arya XO" />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-pressed", "false");

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: KEY, newValue: "1" }),
      );
    });
    expect(btn).toHaveAttribute("aria-pressed", "true");

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: KEY, newValue: null }),
      );
    });
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });
});
