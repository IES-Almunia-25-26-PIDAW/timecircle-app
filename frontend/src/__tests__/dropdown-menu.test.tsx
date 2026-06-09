import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuPortal,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "../app/components/ui/dropdown-menu";

// jsdom doesn't implement scrollIntoView used by Radix — provide a noop.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  // @ts-ignore
  Element.prototype.scrollIntoView = function () {};
}

describe("DropdownMenu UI component", () => {
  test("renders trigger button", () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item A</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    const trigger = screen.getByRole("button", { name: /open menu/i });
    expect(trigger).toBeInTheDocument();
  });

  test("opens content and shows items", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Toggle</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem>Do thing</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Another</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    const trigger = screen.getByRole("button", { name: /toggle/i });
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);

    const action = await screen.findByText("Do thing");
    expect(action).toBeInTheDocument();
    fireEvent.click(action);
  });

  test("renders checkbox and radio items", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked>
            Checked
          </DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup>
            <DropdownMenuRadioItem value="a">A</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="b">B</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    const trigger = screen.getByRole("button", { name: /menu/i });
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);

    expect(await screen.findByText("Checked")).toBeInTheDocument();
    expect(await screen.findByText("A")).toBeInTheDocument();
    expect(await screen.findByText("B")).toBeInTheDocument();
  });

  test("renders portal, destructive/inset item and shortcut", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuPortal>
          <div data-testid="portal-content">In portal</div>
        </DropdownMenuPortal>

        <DropdownMenuTrigger>Extras</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem variant="destructive" inset className="custom">
            Delete
            <DropdownMenuShortcut>Del</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    const trigger = screen.getByRole("button", { name: /extras/i });
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);

    expect(await screen.findByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Del")).toBeInTheDocument();
  });

  test("renders sub menu trigger and content", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Parent</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Submenu</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Sub Item</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    const trigger = screen.getByRole("button", { name: /parent/i });
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);

    const subTrigger = await screen.findByText(/submenu/i);
    // open sub trigger
    fireEvent.pointerDown(subTrigger);
    fireEvent.click(subTrigger);

    expect(await screen.findByText("Sub Item")).toBeInTheDocument();
  });
});
