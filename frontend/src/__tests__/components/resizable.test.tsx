import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "../../app/components/ui/resizable";

describe("Resizable components", () => {
  it("renders panel group and panel with className", () => {
    const { container } = render(
      <ResizablePanelGroup className="group-class">
        <ResizablePanel />
      </ResizablePanelGroup>,
    );

    const group = container.querySelector('[data-slot="resizable-panel-group"]');
    expect(group).toBeInTheDocument();
    expect(group).toHaveClass("group-class");

    const panel = container.querySelector('[data-slot="resizable-panel"]');
    expect(panel).toBeInTheDocument();
  });

  it("renders handle and shows inner handle when withHandle is true", () => {
    const { container, rerender } = render(
      <ResizablePanelGroup>
        <ResizablePanel />
        <ResizableHandle />
        <ResizablePanel />
      </ResizablePanelGroup>,
    );

    const handle = container.querySelector('[data-slot="resizable-handle"]');
    expect(handle).toBeInTheDocument();

    rerender(
      <ResizablePanelGroup>
        <ResizablePanel />
        <ResizableHandle withHandle />
        <ResizablePanel />
      </ResizablePanelGroup>,
    );

    const handleWithInner = container.querySelector('[data-slot="resizable-handle"]');
    expect(handleWithInner).toBeInTheDocument();
    const inner = handleWithInner?.querySelector("div");
    expect(inner).toBeInTheDocument();
  });

  it("applies provided className on handle", () => {
    const { container } = render(
      <ResizablePanelGroup>
        <ResizablePanel />
        <ResizableHandle className="my-handle" />
        <ResizablePanel />
      </ResizablePanelGroup>,
    );
    const handle = container.querySelector('[data-slot="resizable-handle"]');
    expect(handle).toHaveClass("my-handle");
  });
});
