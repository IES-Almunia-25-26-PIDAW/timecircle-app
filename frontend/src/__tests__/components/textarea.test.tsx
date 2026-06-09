import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";

import { Textarea } from "../../app/components/ui/textarea";

describe("Textarea component", () => {
  it("renders textarea with provided className and placeholder", () => {
    const { container, getByPlaceholderText } = render(
      <Textarea className="my-textarea" placeholder="enter text" />,
    );

    const el = container.querySelector('[data-slot="textarea"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass("my-textarea");
    expect(getByPlaceholderText("enter text")).toBeInTheDocument();
  });

  it("supports value and defaultValue props", () => {
    const { container, rerender } = render(<Textarea defaultValue={"hello"} />);
    let el = container.querySelector('[data-slot="textarea"]') as HTMLTextAreaElement | null;
    expect(el).toBeInTheDocument();
    expect(el?.value).toBe("hello");

    rerender(<Textarea value={"controlled"} />);
    el = container.querySelector('[data-slot="textarea"]') as HTMLTextAreaElement | null;
    expect(el?.value).toBe("controlled");
  });

  it("applies disabled attribute", () => {
    const { container } = render(<Textarea disabled />);
    const el = container.querySelector('[data-slot="textarea"]');
    expect(el).toBeInTheDocument();
    expect(el).toBeDisabled();
  });
});
