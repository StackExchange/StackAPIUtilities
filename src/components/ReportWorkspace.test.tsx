import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ReportWorkspace } from "./ReportWorkspace";

describe("ReportWorkspace", () => {
  it("shows report scope notes, run controls, dashboard tab, and raw table tab", async () => {
    render(
      <ReportWorkspace
        reportId="tag-report"
        records={[{ tagName: "python", totalPageViews: 100 }]}
        onRun={() => undefined}
      />,
    );

    expect(screen.getByRole("heading", { name: "Tag Report" })).toBeInTheDocument();
    expect(
      screen.getByText("Session-only credentials required before live API runs."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run Tag Report" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Raw Table" }));

    expect(screen.getByText("python")).toBeInTheDocument();
  });
});
