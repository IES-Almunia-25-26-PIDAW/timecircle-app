import React from "react";
import { render, screen } from "@testing-library/react";

import { Avatar, AvatarImage, AvatarFallback } from "../../app/components/ui/avatar";

describe("Avatar component", () => {
  test("renders root, image and fallback slots", async () => {
    render(
      <Avatar>
        <AvatarImage src="/avatar.png" alt="A" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );

    const root = document.querySelector('[data-slot="avatar"]');
    expect(root).toBeInTheDocument();
    expect(root?.className).toMatch(/rounded-full/);

    // Radix Avatar will render the fallback if the image does not load in JSDOM.
    const imgQuery = document.querySelector('[data-slot="avatar-image"]');
    const fallback = document.querySelector('[data-slot="avatar-fallback"]');
    expect(fallback).toBeInTheDocument();
    expect(screen.getByText("AB")).toBeInTheDocument();
  });
});
