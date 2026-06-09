import React from "react";
// jsdom doesn't implement scrollIntoView used by Radix — provide a noop.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  // @ts-ignore
  Element.prototype.scrollIntoView = function () {};
}
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectGroup,
  SelectSeparator,
} from "../app/components/ui/select";

describe("Select UI component", () => {
  test("renders trigger with placeholder", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">One</SelectItem>
        </SelectContent>
      </Select>
    );

    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText("Choose")).toBeInTheDocument();
  });

  test("opens content and selects an item", async () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Choose number" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Numbers</SelectLabel>
            <SelectItem value="1">One</SelectItem>
            <SelectSeparator />
            <SelectItem value="2">Two</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );

    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    const one = await screen.findByText("One");
    expect(one).toBeInTheDocument();
    fireEvent.click(one);

    // After selecting, the selected label should appear in the trigger
    expect(screen.getByText("One")).toBeInTheDocument();
  });

  test("renders multiple items and selects another", async () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 5 }).map((_, i) => (
            <SelectItem key={i} value={String(i + 1)}>{`Item ${i + 1}`}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );

    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    const item3 = await screen.findByText("Item 3");
    fireEvent.click(item3);

    expect(screen.getByText("Item 3")).toBeInTheDocument();
  });
});
