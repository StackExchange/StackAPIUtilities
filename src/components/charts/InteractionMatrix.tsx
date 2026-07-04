import type { InteractionEdge } from "../../reports/interactions";

interface InteractionMatrixProps {
  edges: InteractionEdge[];
}

export function InteractionMatrix({ edges }: InteractionMatrixProps) {
  if (edges.length === 0) {
    return <div className="dashboard-empty">No interaction data loaded.</div>;
  }

  return (
    <div className="interaction-table-container">
      <table className="s-table s-table__striped interaction-table">
        <thead>
          <tr>
            <th scope="col">Source</th>
            <th scope="col">Target</th>
            <th scope="col" className="ta-right">
              Weight
            </th>
          </tr>
        </thead>
        <tbody>
          {edges.map((edge) => (
            <tr key={`${edge.source}-${edge.target}`}>
              <td>{edge.source}</td>
              <td>{edge.target}</td>
              <td className="ta-right">{edge.weight.toLocaleString("en-US")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
