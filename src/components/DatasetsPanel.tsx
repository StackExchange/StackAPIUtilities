import { formatPeriodLabel } from "../domain/reportScope";
import { reportRegistry } from "../domain/reportRegistry";
import type { ReportId, RunPeriodRole, SessionDataset } from "../domain/types";

interface DatasetsPanelProps {
  datasets: SessionDataset[];
  onRemoveDataset: (datasetId: string) => void;
}

export function DatasetsPanel({ datasets, onRemoveDataset }: DatasetsPanelProps) {
  const sortedDatasets = [...datasets].sort((a, b) => b.loadedAt.localeCompare(a.loadedAt));

  return (
    <section className="workspace-panel datasets-panel" aria-labelledby="datasets-heading">
      <div className="workspace-header">
        <div>
          <p className="workspace-kicker">Session data</p>
          <h2 className="workspace-heading" id="datasets-heading">
            Datasets
          </h2>
        </div>
      </div>
      {sortedDatasets.length === 0 ? (
        <p className="workspace-copy">No datasets loaded in this browser session.</p>
      ) : (
        <div className="datasets-table-wrap">
          <table className="datasets-table">
            <thead>
              <tr>
                <th scope="col">Dataset</th>
                <th scope="col">Report</th>
                <th scope="col">Period</th>
                <th scope="col">Scope</th>
                <th scope="col">Records</th>
                <th scope="col">Source</th>
                <th scope="col">Loaded</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedDatasets.map((dataset) => (
                <tr key={dataset.id}>
                  <td>{dataset.name}</td>
                  <td>{formatReportName(dataset.reportId)}</td>
                  <td>{formatPeriodRole(dataset.periodRole)}</td>
                  <td>{dataset.scope ? formatPeriodLabel(dataset.scope) : "Uploaded file"}</td>
                  <td>{formatRecordCount(dataset.records.length)}</td>
                  <td>{formatSource(dataset.source)}</td>
                  <td>{formatLoadedAt(dataset.loadedAt)}</td>
                  <td>
                    <button
                      className="s-btn s-btn__outlined s-btn__xs"
                      type="button"
                      aria-label={`Remove ${dataset.name} ${dataset.periodRole ?? "upload"} dataset`}
                      onClick={() => onRemoveDataset(dataset.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatReportName(reportId: ReportId | undefined): string {
  if (!reportId) {
    return "Uploaded dataset";
  }

  return reportRegistry.find((report) => report.id === reportId)?.title ?? reportId;
}

function formatPeriodRole(periodRole: RunPeriodRole | undefined): string {
  if (!periodRole) {
    return "Upload";
  }

  return periodRole === "current" ? "Current" : "Comparison";
}

function formatSource(source: SessionDataset["source"]): string {
  return source === "live-api" ? "Live API" : "Upload";
}

function formatRecordCount(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? "record" : "records"}`;
}

function formatLoadedAt(loadedAt: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(loadedAt));
}
