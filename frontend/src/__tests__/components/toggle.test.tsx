import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";

import { Toggle, toggleVariants } from "../../app/components/ui/toggle";

describe("Toggle component", () => {
  it("renders root and accepts className", () => {
    const { container } = render(<Toggle className="my-toggle" />);
    const root = container.querySelector('[data-slot="toggle"]');
    expect(root).toBeInTheDocument();
    expect(root).toHaveClass("my-toggle");
    expect(root).toHaveClass("inline-flex");
  });

  it("generates variant and size classes via toggleVariants", () => {
    const cls = toggleVariants({ variant: "outline", size: "sm" });
    expect(cls).toContain("border");
    expect(cls).toContain("h-8");
  });
});
