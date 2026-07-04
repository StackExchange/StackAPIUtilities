interface BarListRow {
  label: string;
  value: number;
}

interface BarListProps {
  rows: BarListRow[];
  emptyMessage?: string;
}

export function BarList({ rows, emptyMessage = "No chart data loaded." }: BarListProps) {
  if (rows.length === 0) {
    return <div className="dashboard-empty">{emptyMessage}</div>;
  }

  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <div className="bar-list" role="list">
      {rows.map((row) => {
        const width = `${Math.round((row.value / max) * 100)}%`;

        return (
          <div className="bar-row" key={row.label} role="listitem">
            <span className="bar-label">{row.label}</span>
            <span className="bar-track">
              <span
                aria-label={`${row.label}: ${row.value}`}
                className="bar-fill"
                style={{ width }}
              />
            </span>
            <strong className="bar-value">{row.value.toLocaleString("en-US")}</strong>
          </div>
        );
      })}
    </div>
  );
}
