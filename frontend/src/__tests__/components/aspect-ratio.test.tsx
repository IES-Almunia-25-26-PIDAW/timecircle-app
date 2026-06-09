import React from "react";
import { render, screen } from "@testing-library/react";

import { AspectRatio } from "../../app/components/ui/aspect-ratio";

describe("AspectRatio", () => {
  test("renders children and has data-slot attribute", () => {
    render(
      <AspectRatio ratio={16 / 9}>
        <div>inner-content</div>
      </AspectRatio>
    );

    const el = document.querySelector('[data-slot="aspect-ratio"]');
    expect(el).toBeInTheDocument();
    expect(screen.getByText("inner-content")).toBeInTheDocument();
  });
});
