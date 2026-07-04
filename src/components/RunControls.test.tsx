import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RunControls } from "./RunControls";

describe("RunControls", () => {
  it("uses filled Stacks styling for the primary report action", () => {
    render(<RunControls reportId="tag-report" onRun={() => undefined} />);

    expect(screen.getByRole("button", { name: "Run Tag Report" })).toHaveClass("s-btn__filled");
    expect(screen.getByRole("button", { name: "Run selected reports" })).toHaveClass(
      "s-btn__outlined",
      "s-btn__muted",
    );
  });
});
