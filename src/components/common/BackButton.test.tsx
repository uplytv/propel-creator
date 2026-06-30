import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BackButton from "./BackButton";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => navigateMock };
});

function renderBtn(props: Partial<React.ComponentProps<typeof BackButton>> = {}) {
  return render(
    <MemoryRouter>
      <BackButton fallback="/roster" {...props} />
    </MemoryRouter>,
  );
}

describe("BackButton", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    // Reset history.state to a plain object before each test.
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => cleanup());

  it("renders with an accessible label and visible focus styles", () => {
    renderBtn({ label: "Go back" });
    const btn = screen.getByRole("button", { name: "Go back" });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toMatch(/focus-visible:ring-2/);
    expect(btn.className).toMatch(/min-w-\[44px\]/);
    expect(btn.className).toMatch(/h-11/);
  });

  it("navigates to fallback on cold open (no __uplyEntry sentinel)", () => {
    // history.state starts as {}, so the button treats this as the entry page.
    renderBtn();
    fireEvent.click(screen.getByRole("button"));
    expect(navigateMock).toHaveBeenCalledWith("/roster", { replace: true });
  });

  it("falls back safely when history.state access throws", () => {
    const spy = vi
      .spyOn(window.history, "replaceState")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    renderBtn({ fallback: "/home" });
    fireEvent.click(screen.getByRole("button"));
    expect(navigateMock).toHaveBeenCalledWith("/home", { replace: true });
    spy.mockRestore();
  });

  it("pops history (-1) when arriving from a prior in-app navigation", () => {
    // Simulate that a previous in-app page already tagged this entry.
    window.history.replaceState({ __uplyEntry: true }, "", "/");
    renderBtn();
    // Now push a fresh entry (as if user navigated to the current page).
    window.history.pushState({}, "", "/next");
    // Re-render with fresh state untagged on the new entry.
    cleanup();
    renderBtn();
    fireEvent.click(screen.getByRole("button"));
    // First call from replaceState during mount, then click triggers navigate(-1).
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it("uses the default '/' fallback when none provided", () => {
    render(
      <MemoryRouter>
        <BackButton />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
  });
});
