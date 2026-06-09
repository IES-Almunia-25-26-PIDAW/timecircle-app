import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";

import { Slider } from "../../app/components/ui/slider";

describe("Slider component", () => {
  it("renders two thumbs when defaultValue is an array", () => {
    const { container } = render(
      <Slider defaultValue={[10, 90]} min={0} max={100} />,
    );

    const thumbs = container.querySelectorAll('[data-slot="slider-thumb"]');
    expect(thumbs.length).toBe(2);

    expect(container.querySelector('[data-slot="slider-track"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="slider-range"]')).toBeInTheDocument();
  });

  it("renders two thumbs when value is an array (controlled)", () => {
    const { container } = render(
      <Slider value={[20, 80]} min={0} max={100} />,
    );

    const thumbs = container.querySelectorAll('[data-slot="slider-thumb"]');
    expect(thumbs.length).toBe(2);
  });

  it("falls back to [min, max] when neither value nor defaultValue are arrays", () => {
    const { container } = render(<Slider min={5} max={55} />);

    const thumbs = container.querySelectorAll('[data-slot="slider-thumb"]');
    expect(thumbs.length).toBe(2);
  });

  it("applies a custom className to the root element", () => {
    const { container } = render(
      <Slider className="my-custom-slider" defaultValue={[0, 100]} />,
    );

    const root = container.querySelector('[data-slot="slider"]');
    expect(root).toHaveClass("my-custom-slider");
  });
});
