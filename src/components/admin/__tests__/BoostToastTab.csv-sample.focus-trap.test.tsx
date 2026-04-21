import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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

describe("BoostToastTab — CSV dialog focus trap (keyboard-only)", () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => "blob:mock") as unknown as typeof URL.createObjectURL;
    global.URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it("traps focus inside the dialog when tabbing forward and releases only on Escape", async () => {
    const user = userEvent.setup();
    render(<BoostToastTab />);

    // Open the CSV "View sample" dialog via keyboard
    const viewSampleButtons = screen.getAllByRole("button", { name: /view sample/i });
    const csvViewSample = viewSampleButtons[0];
    csvViewSample.focus();
    await user.keyboard("{Enter}");

    const dialog = await screen.findByRole("dialog");

    // Wait for Radix to move focus into the dialog (first focusable = Download sample CSV)
    const downloadBtn = within(dialog).getByRole("button", { name: /download sample csv/i });
    await waitFor(() => {
      expect(document.activeElement).toBe(downloadBtn);
    });

    // Tab forward many times — focus must never escape the dialog while it's open.
    // Cycling should wrap around inside the dialog (Radix focus scope).
    const focusedDuringCycle = new Set<Element>();
    for (let i = 0; i < 15; i++) {
      await user.tab();
      const active = document.activeElement;
      expect(active).not.toBeNull();
      // Focus must remain inside the dialog (or on the dialog itself)
      expect(dialog.contains(active)).toBe(true);
      // Specifically must NOT have returned to the trigger outside the dialog
      expect(active).not.toBe(csvViewSample);
      if (active) focusedDuringCycle.add(active);
    }

    // Sanity: at least one focusable element inside the dialog received focus
    expect(focusedDuringCycle.size).toBeGreaterThan(0);
    // The Download button should have been part of the trapped focus cycle
    expect(focusedDuringCycle.has(downloadBtn)).toBe(true);

    // Escape closes the dialog and releases the trap
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // After close, focus is restored to the trigger (outside the former dialog)
    await waitFor(() => {
      expect(document.activeElement).toBe(csvViewSample);
    });
  });
});
