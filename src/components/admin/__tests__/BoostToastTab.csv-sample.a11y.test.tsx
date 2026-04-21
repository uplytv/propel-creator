import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/hooks/useBoostToastEvents", () => ({
  useBoostToastEvents: () => ({
    isLoading: false,
    data: {
      series: [
        { bucket: "2025-04-20T10:00:00.000Z", shown: 10, clicked: 3 },
      ],
      routes: [
        { route: "/dashboard", shown: 8, clicked: 2, ctr: 0.25 },
      ],
      totals: { shown: 10, clicked: 3, ctr: 0.3 },
    },
  }),
  useBoostRoutesList: () => ({ data: ["/dashboard"] }),
}));

import BoostToastTab from "@/components/admin/BoostToastTab";

describe("BoostToastTab — Example Export CSV dialog accessibility", () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => "blob:mock") as unknown as typeof URL.createObjectURL;
    global.URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it("opens dialog with Escape-to-close, focus trapped, and a properly labeled Download button reachable by Tab", async () => {
    const user = userEvent.setup();
    render(<BoostToastTab />);

    // Open the CSV sample modal
    const viewSampleButtons = screen.getAllByRole("button", { name: /view sample/i });
    fireEvent.click(viewSampleButtons[0]);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Dialog has an accessible name from DialogTitle
    expect(dialog).toHaveAccessibleName(/example export csv/i);

    // Download button is present, has correct accessible name, and is enabled
    const downloadBtn = screen.getByRole("button", { name: /download sample csv/i });
    expect(downloadBtn).toBeInTheDocument();
    expect(downloadBtn).toBeEnabled();
    expect(downloadBtn).toHaveAccessibleName(/download sample csv/i);
    // Button is reachable via keyboard (not aria-hidden / not tabindex=-1)
    expect(downloadBtn).not.toHaveAttribute("aria-hidden", "true");
    expect(downloadBtn.getAttribute("tabindex")).not.toBe("-1");

    // Tab through dialog focusables until we reach Download (focus trap keeps us in dialog)
    let reached = false;
    for (let i = 0; i < 12; i++) {
      await user.tab();
      if (document.activeElement === downloadBtn) {
        reached = true;
        break;
      }
    }
    expect(reached).toBe(true);

    // Activating with keyboard triggers the download handler
    await user.keyboard("{Enter}");
    expect(global.URL.createObjectURL).toHaveBeenCalled();

    // Escape closes the dialog
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
