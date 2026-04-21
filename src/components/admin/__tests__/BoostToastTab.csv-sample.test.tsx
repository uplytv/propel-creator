import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock the data hooks before importing the component
vi.mock("@/hooks/useBoostToastEvents", () => ({
  useBoostToastEvents: () => ({
    isLoading: false,
    data: {
      series: [
        { bucket: "2025-04-20T10:00:00.000Z", shown: 10, clicked: 3 },
        { bucket: "2025-04-20T11:00:00.000Z", shown: 5, clicked: 1 },
      ],
      routes: [
        { route: "/dashboard", shown: 8, clicked: 2, ctr: 0.25 },
        { route: "/clip/abc", shown: 7, clicked: 2, ctr: 0.2857 },
      ],
      totals: { shown: 15, clicked: 4, ctr: 0.2667 },
    },
  }),
  useBoostRoutesList: () => ({ data: ["/dashboard", "/clip/abc"] }),
}));

import BoostToastTab from "@/components/admin/BoostToastTab";

describe("BoostToastTab — CSV sample download matches preview byte-for-byte", () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let capturedBlob: Blob | null = null;

  beforeEach(() => {
    capturedBlob = null;
    createObjectURLSpy = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return "blob:mock";
    });
    revokeObjectURLSpy = vi.fn();
    global.URL.createObjectURL = createObjectURLSpy as unknown as typeof URL.createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURLSpy as unknown as typeof URL.revokeObjectURL;
    // Stub anchor click so jsdom doesn't try to navigate
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downloads the same string shown in the modal preview", async () => {
    render(<BoostToastTab />);

    // Open the CSV sample modal via the "View sample" link next to Export CSV
    const viewSampleButtons = screen.getAllByRole("button", { name: /view sample/i });
    fireEvent.click(viewSampleButtons[0]);

    // Wait for the dialog with the preview <pre>
    const dialog = await screen.findByRole("dialog");
    const pre = dialog.querySelector("pre");
    expect(pre).toBeTruthy();
    const previewText = pre!.textContent ?? "";

    // Sanity: contains the frozen generated_at line
    expect(previewText).toMatch(/# range=7d state=all route=all generated_at=/);

    // Click Download sample CSV
    const downloadBtn = screen.getByRole("button", { name: /download sample csv/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => expect(createObjectURLSpy).toHaveBeenCalledTimes(1));
    expect(capturedBlob).toBeInstanceOf(Blob);

    const downloadedText = await capturedBlob!.text();

    // Byte-for-byte equality, including the frozen generated_at line
    expect(downloadedText).toBe(previewText);
  });
});
