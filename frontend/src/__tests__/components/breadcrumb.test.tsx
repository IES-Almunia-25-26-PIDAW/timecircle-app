import React from "react";
import { render, screen } from "@testing-library/react";

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "../../app/components/ui/breadcrumb";

describe("Breadcrumb components", () => {
  test("renders breadcrumb structure with separator and ellipsis", () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
            <BreadcrumbSeparator />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbList>
      </Breadcrumb>
    );

    expect(document.querySelector('[data-slot="breadcrumb"]')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="breadcrumb-list"]')).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="breadcrumb-separator"]')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="breadcrumb-ellipsis"]')).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();
  });
});
