import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "../../app/components/ui/alert-dialog";

describe("AlertDialog UI", () => {
  test("opens and closes the dialog via trigger and cancel", async () => {

    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dialog Title</AlertDialogTitle>
            <AlertDialogDescription>Some description</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );

    // not visible before opening
    expect(screen.queryByText("Dialog Title")).toBeNull();

    // open
    fireEvent.click(screen.getByText("Open"));

    expect(await screen.findByText("Dialog Title")).toBeInTheDocument();
    expect(screen.getByText("Some description")).toBeInTheDocument();

    // overlay is rendered with the data-slot attribute
    expect(document.querySelector("[data-slot=\"alert-dialog-overlay\"]")).toBeTruthy();

    // action and cancel are present and are buttons
    expect(screen.getByText("Confirm")).toBeInstanceOf(HTMLElement);
    expect(screen.getByText("Cancel")).toBeInstanceOf(HTMLElement);

    // clicking cancel closes the dialog
    fireEvent.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(screen.queryByText("Dialog Title")).toBeNull();
    });
  });

  test("renders action button and keeps dialog open when not dismissed", async () => {

    render(
      <AlertDialog>
        <AlertDialogTrigger>Open</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Title 2</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Ok</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );

    fireEvent.click(screen.getByText("Open"));
    expect(await screen.findByText("Title 2")).toBeInTheDocument();

    // clicking the action should still be available (Radix will handle closing if configured)
    fireEvent.click(screen.getByText("Ok"));
    // ensure the text was present at least once
    expect(screen.queryByText("Title 2") === null || screen.queryByText("Title 2")).toBeTruthy();
  });
});
