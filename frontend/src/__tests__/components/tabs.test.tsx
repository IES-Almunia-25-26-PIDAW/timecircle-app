import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../app/components/ui/tabs";

describe("Tabs components", () => {
  it("renders tabs list, triggers and content", () => {
    const { container, getByText } = render(
      <Tabs defaultValue="tab2" className="my-tabs">
        <TabsList>
          <TabsTrigger value="tab1">One</TabsTrigger>
          <TabsTrigger value="tab2">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content One</TabsContent>
        <TabsContent value="tab2">Content Two</TabsContent>
      </Tabs>,
    );

    expect(container.querySelector('[data-slot="tabs"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="tabs-list"]')).toBeInTheDocument();
    const triggers = container.querySelectorAll('[data-slot="tabs-trigger"]');
    expect(triggers.length).toBe(2);

    const activeContent = container.querySelector('[data-slot="tabs-content"][data-state="active"]');
    expect(activeContent).toBeInTheDocument();
    expect(activeContent).toHaveTextContent("Content Two");
    expect(container.querySelector('[data-slot="tabs"]')).toHaveClass("my-tabs");
  });
});
