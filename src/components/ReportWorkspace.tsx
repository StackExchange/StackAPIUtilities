import { useState } from "react";
import { reportRegistry } from "../domain/reportRegistry";
import type { ReportId } from "../domain/types";
import { DataTable } from "./DataTable";
import { RunControls } from "./RunControls";

interface ReportWorkspaceProps {
  reportId: ReportId;
  records: Record<string, unknown>[];
  onRun: () => void;
}

export function ReportWorkspace({ reportId, records, onRun }: ReportWorkspaceProps) {
  const [tab, setTab] = useState<"dashboard" | "table">("dashboard");
  const report = reportRegistry.find((candidate) => candidate.id === reportId)!;

  return (
    <section className="workspace-panel" aria-labelledby="selected-report-heading">
      <div className="workspace-header">
        <p className="fs-caption fc-light mb4">{report.sourceRepo}</p>
        <h2 className="fs-headline2 m0" id="selected-report-heading">
          {report.title}
        </h2>
      </div>
      <p className="fs-body2 workspace-copy">{report.description}</p>
      <div className="s-notice s-notice__info mt12" role="note">
        <p className="m0">Session-only credentials required before live API runs.</p>
      </div>
      <RunControls reportId={reportId} onRun={onRun} />
      <div className="s-navigation s-navigation__muted report-tabs" role="tablist">
        <button
          className="s-navigation--item"
          type="button"
          role="tab"
          aria-selected={tab === "dashboard"}
          onClick={() => setTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          className="s-navigation--item"
          type="button"
          role="tab"
          aria-selected={tab === "table"}
          onClick={() => setTab("table")}
        >
          Raw Table
        </button>
      </div>
      {tab === "dashboard" ? (
        <div className="dashboard-placeholder">
          Dashboard cards and charts render here when data is loaded.
        </div>
      ) : (
        <div className="raw-table-panel">
          <DataTable records={records} />
        </div>
      )}
    </section>
  );
}
