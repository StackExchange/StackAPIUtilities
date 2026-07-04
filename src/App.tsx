import { useReducer, useState } from "react";
import { AppShell, type AppPanel } from "./components/AppShell";
import { CredentialsPanel } from "./components/CredentialsPanel";
import { ReportCatalog } from "./components/ReportCatalog";
import { SessionOverview } from "./components/SessionOverview";
import { reportRegistry } from "./domain/reportRegistry";
import { createInitialSessionState, sessionReducer } from "./domain/sessionStore";

export function App() {
  const [state, dispatch] = useReducer(sessionReducer, undefined, createInitialSessionState);
  const [activePanel, setActivePanel] = useState<AppPanel>("report");
  const selectedReport =
    reportRegistry.find((report) => report.id === state.selectedReportId) ?? reportRegistry[0];

  return (
    <AppShell
      activePanel={activePanel}
      onPanelChange={setActivePanel}
      sidebar={
        <ReportCatalog
          selectedReportId={selectedReport.id}
          onSelect={(reportId) => {
            dispatch({ type: "report/select", reportId });
            setActivePanel("report");
          }}
        />
      }
    >
      {activePanel === "credentials" && <CredentialsPanel />}
      {activePanel === "uploads" && (
        <section className="workspace-panel" aria-labelledby="uploads-heading">
          <div className="workspace-header">
            <p className="fs-caption fc-light mb4">Local files</p>
            <h2 className="fs-headline2 m0" id="uploads-heading">
              Uploads
            </h2>
          </div>
          <p className="fs-body2 workspace-copy">
            Upload handling arrives in the next reporting MVP slice.
          </p>
        </section>
      )}
      {activePanel === "report" && (
        <div className="workspace-stack">
          <section className="workspace-panel" aria-labelledby="selected-report-heading">
            <div className="workspace-header">
              <p className="fs-caption fc-light mb4">{selectedReport.sourceRepo}</p>
              <h2 className="fs-headline2 m0" id="selected-report-heading">
                {selectedReport.title}
              </h2>
            </div>
            <p className="fs-body2 workspace-copy">{selectedReport.description}</p>
          </section>
          <SessionOverview state={state} />
        </div>
      )}
    </AppShell>
  );
}
