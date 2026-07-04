import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SessionDataset } from "../domain/types";
import { DatasetsPanel } from "./DatasetsPanel";

describe("DatasetsPanel", () => {
  it("shows an empty state before datasets are loaded", () => {
    render(<DatasetsPanel datasets={[]} onRemoveDataset={() => undefined} />);

    expect(screen.getByRole("heading", { name: "Datasets" })).toBeInTheDocument();
    expect(screen.getByText("No datasets loaded in this browser session.")).toBeInTheDocument();
  });

  it("lists scoped live datasets and removes a dataset by id", async () => {
    const user = userEvent.setup();
    const onRemoveDataset = vi.fn();

    render(<DatasetsPanel datasets={[liveDataset()]} onRemoveDataset={onRemoveDataset} />);

    expect(screen.getByText("users")).toBeInTheDocument();
    expect(screen.getByText("Inactive Users")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("2026-06-01 to 2026-06-30")).toBeInTheDocument();
    expect(screen.getByText("2 records")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove users current dataset" }));

    expect(onRemoveDataset).toHaveBeenCalledWith("dataset-1");
  });
});

function liveDataset(): SessionDataset {
  return {
    id: "dataset-1",
    snapshotId: "snapshot-1",
    reportId: "inactive-users",
    name: "users",
    records: [{ user_id: 1 }, { user_id: 2 }],
    loadedAt: "2026-07-03T12:00:00.000Z",
    source: "live-api",
    periodRole: "current",
    scope: { startDate: "2026-06-01", endDate: "2026-06-30" },
  };
}
