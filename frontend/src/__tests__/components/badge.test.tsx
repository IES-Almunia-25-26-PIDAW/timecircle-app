import React from "react";
import { render, screen } from "@testing-library/react";

import { Badge } from "../../app/components/ui/badge";

describe("Badge", () => {
  test("renders default badge with data-slot", () => {
    render(<Badge>New</Badge>);

    const el = document.querySelector('[data-slot="badge"]');
    expect(el).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  test("applies destructive variant classes", () => {
    render(<Badge variant="destructive">X</Badge>);

    const el = document.querySelector('[data-slot="badge"]');
    expect(el).toBeInTheDocument();
    expect(el?.className).toMatch(/bg-destructive|text-destructive|text-white/);
  });

  test("renders as child when asChild is true", () => {
    render(
      <Badge asChild>
        <a href="/a">link</a>
      </Badge>
    );

    const anchor = screen.getByText("link").closest("a");
    expect(anchor).toBeInTheDocument();
    expect(anchor).toHaveAttribute("data-slot", "badge");
  });
});
