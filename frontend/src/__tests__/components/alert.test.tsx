import React from "react";
import { render, screen } from "@testing-library/react";

import { Alert, AlertTitle, AlertDescription } from "../../app/components/ui/alert";

describe("Alert component", () => {
  test("renders title and description and has role alert", () => {
    render(
      <Alert>
        <svg aria-hidden="true" />
        <AlertTitle>My title</AlertTitle>
        <AlertDescription>desc</AlertDescription>
      </Alert>
    );

    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute("data-slot", "alert");
    expect(screen.getByText("My title")).toBeInTheDocument();
    expect(screen.getByText("desc")).toBeInTheDocument();
  });

  test("applies destructive variant classes", () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Danger</AlertTitle>
        <AlertDescription>Be careful</AlertDescription>
      </Alert>
    );

    const alert = screen.getByRole("alert");
    expect(alert.className).toMatch(/text-destructive/);
  });
});
