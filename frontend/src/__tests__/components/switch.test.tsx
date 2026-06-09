import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";

import { Switch } from "../../app/components/ui/switch";

describe("Switch component", () => {
  it("renders switch and thumb", () => {
    const { container } = render(<Switch />);
    const root = container.querySelector('[data-slot="switch"]');
    const thumb = container.querySelector('[data-slot="switch-thumb"]');
    expect(root).toBeInTheDocument();
    expect(thumb).toBeInTheDocument();
  });

  it("reflects defaultChecked state", () => {
    const { container } = render(<Switch defaultChecked />);
    const root = container.querySelector('[data-slot="switch"]');
    expect(root?.getAttribute("data-state")).toBe("checked");
  });

  it("reflects controlled checked prop", () => {
    const { container } = render(<Switch checked />);
    const root = container.querySelector('[data-slot="switch"]');
    expect(root?.getAttribute("data-state")).toBe("checked");
  });

  it("applies custom className", () => {
    const { container } = render(<Switch className="my-switch" />);
    const root = container.querySelector('[data-slot="switch"]');
    expect(root).toHaveClass("my-switch");
  });
});
