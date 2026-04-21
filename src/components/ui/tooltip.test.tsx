import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
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
});
