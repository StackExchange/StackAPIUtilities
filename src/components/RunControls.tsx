import { reportRegistry } from "../domain/reportRegistry";
import type { ReportId } from "../domain/types";

interface RunControlsProps {
  reportId: ReportId;
  onRun: () => void;
}

export function RunControls({ reportId, onRun }: RunControlsProps) {
  const report = reportRegistry.find((candidate) => candidate.id === reportId)!;

  return (
    <div className="run-controls">
      <button className="s-btn s-btn__primary" type="button" onClick={onRun}>
        Run {report.title}
      </button>
      <button
        className="s-btn s-btn__muted"
        type="button"
        disabled
        title="Batch report runs arrive after report selection controls."
      >
        Run selected reports
      </button>
    </div>
  );
}
