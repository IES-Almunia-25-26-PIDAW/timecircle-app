import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";

import { RadioGroup, RadioGroupItem } from "../../app/components/ui/radio-group";

describe("RadioGroup component", () => {
  it("renders items and applies className on root", () => {
    const { container } = render(
      <RadioGroup className="my-radio-group">
        <RadioGroupItem value="a" />
        <RadioGroupItem value="b" />
      </RadioGroup>,
    );

    expect(container.querySelector('[data-slot="radio-group"]')).toBeInTheDocument();
    const items = container.querySelectorAll('[data-slot="radio-group-item"]');
    expect(items.length).toBe(2);
    expect(container.querySelector('[data-slot="radio-group"]')).toHaveClass("my-radio-group");
  });

  it("respects defaultValue and marks the selected item as checked", () => {
    const { container } = render(
      <RadioGroup defaultValue="b">
        <RadioGroupItem value="a" />
        <RadioGroupItem value="b" />
      </RadioGroup>,
    );

    const items = container.querySelectorAll('[data-slot="radio-group-item"]');
    const selected = Array.from(items).find((el) => el.getAttribute("aria-checked") === "true");
    expect(selected).toBeTruthy();
    expect(selected?.getAttribute("aria-checked")).toBe("true");
    // indicator element exists inside items
    const indicator = container.querySelector('[data-slot="radio-group-indicator"]');
    expect(indicator).toBeInTheDocument();
  });

  it("applies disabled on item when prop is passed", () => {
    const { container } = render(
      <RadioGroup>
        <RadioGroupItem value="a" disabled />
        <RadioGroupItem value="b" />
      </RadioGroup>,
    );

    const items = container.querySelectorAll('[data-slot="radio-group-item"]');
    const disabled = Array.from(items).find((el) => el.hasAttribute("disabled"));
    expect(disabled).toBeTruthy();
  });
});
