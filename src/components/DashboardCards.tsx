import type { MetricCard } from "../reports/reportModels";

interface DashboardCardsProps {
  cards: MetricCard[];
  emptyMessage?: string;
}

export function DashboardCards({
  cards,
  emptyMessage = "No dashboard data loaded yet.",
}: DashboardCardsProps) {
  if (cards.length === 0) {
    return <div className="dashboard-empty">{emptyMessage}</div>;
  }

  return (
    <div className="dashboard-card-grid" aria-label="Report metrics">
      {cards.map((card) => (
        <dl className="dashboard-metric" key={card.label}>
          <dt className="dashboard-metric-label">{card.label}</dt>
          <dd className="dashboard-metric-value">{formatMetricValue(card.value)}</dd>
        </dl>
      ))}
    </div>
  );
}

function formatMetricValue(value: MetricCard["value"]) {
  return typeof value === "number" ? value.toLocaleString("en-US") : value;
}
