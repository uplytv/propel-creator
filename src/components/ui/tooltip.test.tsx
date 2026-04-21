import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

describe("Tooltip", () => {
  it("exports Tooltip, TooltipTrigger, TooltipContent as defined", () => {
    expect(Tooltip).toBeDefined();
    expect(TooltipTrigger).toBeDefined();
    expect(TooltipContent).toBeDefined();
  });

  it("renders trigger without throwing", () => {
    const { getByRole } = render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Open</button>
          </TooltipTrigger>
          <TooltipContent>Hello</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(getByRole("button", { name: "Open" })).toBeInTheDocument();
  });

  it("renders open tooltip content without throwing", () => {
    const { getAllByText } = render(
      <TooltipProvider>
        <Tooltip defaultOpen>
          <TooltipTrigger asChild>
            <button>Open</button>
          </TooltipTrigger>
          <TooltipContent>Tooltip content here</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    expect(getAllByText("Tooltip content here").length).toBeGreaterThan(0);
  });

  it("shows TooltipContent on hover and does not throw", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Hover me</button>
          </TooltipTrigger>
          <TooltipContent>Hovered tooltip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    expect(screen.queryByText("Hovered tooltip text")).not.toBeInTheDocument();

    await user.hover(screen.getByRole("button", { name: "Hover me" }));

    await waitFor(() => {
      expect(screen.getAllByText("Hovered tooltip text").length).toBeGreaterThan(0);
    });
  });
});
