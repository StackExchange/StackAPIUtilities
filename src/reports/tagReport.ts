import type { MetricCard } from "./reportModels";

export interface TagMetricRow {
  tagName: string;
  totalPageViews: number;
  tagWatchers: number;
  totalSmes: number;
  questionCount: number;
  answerCount: number;
}

export function summarizeTags(rows: TagMetricRow[]) {
  const totalViews = rows.reduce((sum, row) => sum + metricNumber(row.totalPageViews), 0);
  const totalQuestions = rows.reduce((sum, row) => sum + metricNumber(row.questionCount), 0);
  const metricCards: MetricCard[] = [
    { label: "Tags", value: rows.length },
    { label: "Page Views", value: totalViews },
    { label: "Questions", value: totalQuestions },
  ];
  return {
    metricCards,
    topTagsByViews: [...rows]
      .sort((a, b) => metricNumber(b.totalPageViews) - metricNumber(a.totalPageViews))
      .slice(0, 10),
  };
}

function metricNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
