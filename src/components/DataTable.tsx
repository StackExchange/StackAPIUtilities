import { useMemo, useState } from "react";

interface DataTableProps {
  records: Record<string, unknown>[];
}

export function DataTable({ records }: DataTableProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const columns = useMemo(
    () => Array.from(new Set(records.flatMap((record) => Object.keys(record)))),
    [records],
  );
  const filteredRecords = normalizedQuery
    ? records.filter((record) =>
        Object.values(record).some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(normalizedQuery),
        ),
      )
    : records;

  if (records.length === 0) {
    return (
      <div className="empty-panel" role="status">
        No records loaded yet.
      </div>
    );
  }

  return (
    <div className="data-table">
      <label className="d-block mb8">
        <span className="d-block fs-caption tt-uppercase fc-light mb4">Search</span>
        <input
          className="s-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="s-table-container data-table-container">
        <table className="s-table s-table__striped">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column}>{String(record[column] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
