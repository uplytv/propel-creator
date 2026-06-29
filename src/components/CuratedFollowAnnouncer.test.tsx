/**
 * Screen reader announcement: clicking follow/unfollow in any results view
 * must update a single polite aria-live region so assistive tech hears the
 * state change immediately, regardless of which view (Search page vs
 * global engine results) the click originated from.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import CuratedFollowButton from "@/components/CuratedFollowButton";
import CuratedFollowAnnouncer from "@/components/CuratedFollowAnnouncer";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

describe("CuratedFollowAnnouncer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it("renders a polite live region", () => {
    render(<CuratedFollowAnnouncer />);
    const live = screen.getByTestId("curated-follow-announcer");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveAttribute("aria-atomic", "true");
    expect(live).toHaveAttribute("role", "status");
  });

  it("announces follow + unfollow with the creator's display name", () => {
    render(
      <>
        <CuratedFollowAnnouncer />
        <CuratedFollowButton followKey="aryaxo" displayName="Arya XO" />
      </>,
    );
    const live = screen.getByTestId("curated-follow-announcer");
    const btn = screen.getByRole("button");

    fireEvent.click(btn);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(live).toHaveTextContent("Now following Arya XO");

    fireEvent.click(btn);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(live).toHaveTextContent("Unfollowed Arya XO");
  });

  it("announces when triggered from a different view via the shared event", () => {
    render(
      <>
        <CuratedFollowAnnouncer />
        <CuratedFollowButton followKey="aryaxo" displayName="Arya XO" />
        <CuratedFollowButton followKey="aryaxo" displayName="Arya XO" />
      </>,
    );
    const live = screen.getByTestId("curated-follow-announcer");
    const [first] = screen.getAllByRole("button");

    fireEvent.click(first);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    // Both buttons + the announcer reacted to the same broadcast.
    expect(live).toHaveTextContent("Now following Arya XO");
    const [a, b] = screen.getAllByRole("button");
    expect(a).toHaveAttribute("aria-pressed", "true");
    expect(b).toHaveAttribute("aria-pressed", "true");
  });
});
