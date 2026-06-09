import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";

import { Tooltip, TooltipTrigger, TooltipContent } from "../../app/components/ui/tooltip";

describe("Tooltip components", () => {
  it("renders trigger and portal content", () => {
    const { container } = render(
      <Tooltip open>
        <TooltipTrigger>hover me</TooltipTrigger>
        <TooltipContent>Helpful tip</TooltipContent>
      </Tooltip>,
    );

    const trigger = container.querySelector('[data-slot="tooltip-trigger"]');
    expect(trigger).toBeInTheDocument();

    const content = document.body.querySelector('[data-slot="tooltip-content"]');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent("Helpful tip");
  });
});
