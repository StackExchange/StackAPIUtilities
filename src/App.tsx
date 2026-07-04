import { useReducer, useState } from "react";
import { AppShell, type AppPanel } from "./components/AppShell";
import { CredentialsPanel } from "./components/CredentialsPanel";
import { ReportCatalog } from "./components/ReportCatalog";
import { ReportWorkspace } from "./components/ReportWorkspace";
import { RunStatus } from "./components/RunStatus";
import { SessionOverview } from "./components/SessionOverview";
import { UploadsPanel } from "./components/UploadsPanel";
import { reportRegistry } from "./domain/reportRegistry";
import { createInitialSessionState, sessionReducer } from "./domain/sessionStore";
import type { ReportId, RunQueueItem } from "./domain/types";

export function App() {
  const [state, dispatch] = useReducer(sessionReducer, undefined, createInitialSessionState);
  const [activePanel, setActivePanel] = useState<AppPanel>("report");
  const [runQueue, setRunQueue] = useState<RunQueueItem[]>([]);

  function selectReport(reportId: ReportId) {
    dispatch({ type: "report/select", reportId });
    setActivePanel("report");
  }

  function queueSelectedReportRun() {
    const report = reportRegistry.find((candidate) => candidate.id === state.selectedReportId)!;
    setRunQueue([
      {
        id: `${state.selectedReportId}-preview-run`,
        reportId: state.selectedReportId,
        status: "queued",
        message: `${report.title} queued for browser-only execution wiring.`,
      },
    ]);
  }

  return (
    <AppShell
      activePanel={activePanel}
      onPanelChange={setActivePanel}
      sidebar={
        <ReportCatalog selectedReportId={state.selectedReportId} onSelect={selectReport} />
      }
    >
      <SessionOverview state={state} />
      <RunStatus queue={runQueue} />
      {activePanel === "credentials" && <CredentialsPanel />}
      {activePanel === "uploads" && <UploadsPanel />}
      {activePanel === "report" && (
        <ReportWorkspace
          reportId={state.selectedReportId}
          records={[]}
          onRun={queueSelectedReportRun}
        />
      )}
    </AppShell>
  );
}
