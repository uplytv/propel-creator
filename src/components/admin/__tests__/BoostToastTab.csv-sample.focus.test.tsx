import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/hooks/useBoostToastEvents", () => ({
  useBoostToastEvents: () => ({
    isLoading: false,
    data: {
      series: [{ bucket: "2025-04-20T10:00:00.000Z", shown: 10, clicked: 3 }],
      routes: [{ route: "/dashboard", shown: 8, clicked: 2, ctr: 0.25 }],
      totals: { shown: 10, clicked: 3, ctr: 0.3 },
    },
  }),
  useBoostRoutesList: () => ({ data: ["/dashboard"] }),
}));

import BoostToastTab from "@/components/admin/BoostToastTab";

describe("BoostToastTab — keyboard focus management for CSV sample dialog", () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => "blob:mock") as unknown as typeof URL.createObjectURL;
    global.URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it("moves focus into the dialog on open and restores focus to the View sample trigger on Escape", async () => {
    const user = userEvent.setup();
    render(<BoostToastTab />);

    // The "View sample" button next to Export CSV is the first one in the DOM
    const viewSampleButtons = screen.getAllByRole("button", { name: /view sample/i });
    const csvViewSample = viewSampleButtons[0];

    // Focus the trigger and activate it via keyboard
    csvViewSample.focus();
    expect(document.activeElement).toBe(csvViewSample);
    await user.keyboard("{Enter}");

    // Dialog opens
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Radix focuses the dialog's close button ("Close") on open by default.
    // Assert focus has moved into the dialog and onto the Close button specifically.
    await waitFor(() => {
      expect(document.activeElement).not.toBe(csvViewSample);
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
    const closeBtn = screen.getByRole("button", { name: /close/i });
    await waitFor(() => {
      expect(document.activeElement).toBe(closeBtn);
    });

    // Close with Escape
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Focus is restored to the original "View sample" trigger
    await waitFor(() => {
      expect(document.activeElement).toBe(csvViewSample);
    });
  });
});
