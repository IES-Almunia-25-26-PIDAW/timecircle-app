import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";

import { ToggleGroup, ToggleGroupItem } from "../../app/components/ui/toggle-group";

describe("ToggleGroup component", () => {
  it("renders items and applies className and context attrs", () => {
    const { container } = render(
      <ToggleGroup className="my-toggle" variant="outline" size="sm" type="single">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b" disabled>B</ToggleGroupItem>
      </ToggleGroup>,
    );

    const root = container.querySelector('[data-slot="toggle-group"]');
    expect(root).toBeInTheDocument();
    expect(root).toHaveClass("my-toggle");
    expect(root).toHaveAttribute("data-variant", "outline");
    expect(root).toHaveAttribute("data-size", "sm");

    const items = container.querySelectorAll('[data-slot="toggle-group-item"]');
    expect(items.length).toBe(2);
    const first = items[0];
    expect(first).toHaveAttribute("data-variant", "outline");
    expect(first).toHaveAttribute("data-size", "sm");

    const disabled = Array.from(items).find((el) => el.hasAttribute("disabled"));
    expect(disabled).toBeTruthy();
  });

  it("lets an item override variant/size when context provides none", () => {
    const { container } = render(
      <ToggleGroup type="single">
        <ToggleGroupItem variant="ghost" size="lg">X</ToggleGroupItem>
      </ToggleGroup>,
    );

    const item = container.querySelector('[data-slot="toggle-group-item"]');
    expect(item).toBeInTheDocument();
    expect(item).toHaveAttribute("data-variant", "ghost");
    expect(item).toHaveAttribute("data-size", "lg");
  });
});
