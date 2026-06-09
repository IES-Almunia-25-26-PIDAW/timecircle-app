import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect } from "vitest";

import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "../../app/components/ui/table";

describe("Table components", () => {
  it("renders table container and table element", () => {
    const { container } = render(
      <Table className="my-table" data-testid="tbl" />,
    );

    const containerDiv = container.querySelector('[data-slot="table-container"]');
    const table = container.querySelector('[data-slot="table"]');
    expect(containerDiv).toBeInTheDocument();
    expect(table).toBeInTheDocument();
    expect(table).toHaveClass("my-table");
  });

  it("renders header, body, footer and rows/cells correctly", () => {
    const { container, getByText } = render(
      <Table>
        <TableCaption>caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>H1</TableHead>
            <TableHead>H2</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>c1</TableCell>
            <TableCell>c2</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>f1</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    expect(getByText("caption")).toBeInTheDocument();
    expect(getByText("H1")).toBeInTheDocument();
    expect(getByText("c1")).toBeInTheDocument();
    expect(getByText("f1")).toBeInTheDocument();

    expect(container.querySelector('[data-slot="table-header"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="table-body"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="table-footer"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="table-row"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="table-cell"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="table-head"]')).toBeInTheDocument();
  });
});
