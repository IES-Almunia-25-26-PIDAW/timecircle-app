import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";

import { ScrollArea, ScrollBar } from "../../app/components/ui/scroll-area";

describe("ScrollArea component", () => {
  it("renders viewport and children", () => {
    const { container, getByText } = render(
      <ScrollArea>
        <div>inner content</div>
      </ScrollArea>,
    );

    expect(getByText("inner content")).toBeInTheDocument();
    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]');
    expect(viewport).toBeInTheDocument();
  });

  it("renders vertical scrollbar component without throwing", () => {
    const { container } = render(
      <ScrollArea>
        <ScrollBar />
      </ScrollArea>,
    );

    const root = container.querySelector('[data-slot="scroll-area"]');
    expect(root).toBeInTheDocument();
  });

  it("renders horizontal scrollbar component without throwing", () => {
    const { container } = render(
      <ScrollArea>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>,
    );
    const root = container.querySelector('[data-slot="scroll-area"]');
    expect(root).toBeInTheDocument();
  });
});
