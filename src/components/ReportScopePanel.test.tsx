import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_REPORT_RUN_SCOPE } from "../domain/reportScope";
import { ReportScopePanel } from "./ReportScopePanel";

describe("ReportScopePanel", () => {
  it("edits current period and volume controls", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ReportScopePanel scope={DEFAULT_REPORT_RUN_SCOPE} onChange={onChange} />);

    await user.type(screen.getByLabelText("Current start date"), "2026-01-01");
    await user.clear(screen.getByLabelText("Page size"));
    await user.type(screen.getByLabelText("Page size"), "50");

    expect(onChange).toHaveBeenCalled();
  });

  it("enables comparison period controls", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ReportScopePanel scope={DEFAULT_REPORT_RUN_SCOPE} onChange={onChange} />);
    await user.click(screen.getByLabelText("Enable comparison period"));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ comparison: {} }));
  });
});
