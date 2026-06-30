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
    window.sessionStorage.clear();
  });

  afterEach(() => cleanup());

  it("renders with an accessible label, focus ring, and 44px tap target", () => {
    renderBtn({ label: "Go back" });
    const btn = screen.getByRole("button", { name: "Go back" });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toMatch(/focus-visible:ring-2/);
    expect(btn.className).toMatch(/min-w-\[44px\]/);
    expect(btn.className).toMatch(/h-11/);
  });

  it("navigates to fallback on cold open (no prior session flag)", () => {
    renderBtn();
    fireEvent.click(screen.getByRole("button"));
    expect(navigateMock).toHaveBeenCalledWith("/roster", { replace: true });
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

  it("falls back safely when sessionStorage access throws", () => {
    const getSpy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    renderBtn({ fallback: "/home" });
    fireEvent.click(screen.getByRole("button"));
    expect(navigateMock).toHaveBeenCalledWith("/home", { replace: true });
    getSpy.mockRestore();
  });

  it("pops history (-1) when a prior in-app page already set the flag", () => {
    // Simulate that a previous page already mounted a BackButton.
    window.sessionStorage.setItem("uply:back-button:visited", "1");
    renderBtn();
    fireEvent.click(screen.getByRole("button"));
    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  it("the first instance marks entry; later instances pop back", () => {
    // First mount = entry page.
    const first = render(
      <MemoryRouter>
        <BackButton fallback="/roster" />
      </MemoryRouter>,
    );
    fireEvent.click(first.getByRole("button"));
    expect(navigateMock).toHaveBeenLastCalledWith("/roster", { replace: true });
    first.unmount();

    // Second mount in same "session" = should pop history.
    const second = render(
      <MemoryRouter>
        <BackButton fallback="/roster" />
      </MemoryRouter>,
    );
    fireEvent.click(second.getByRole("button"));
    expect(navigateMock).toHaveBeenLastCalledWith(-1);
  });
});
