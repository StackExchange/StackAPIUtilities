import type { SessionDataset } from "../domain/types";
import { downloadTextFile, recordsToCsv, recordsToJson } from "./downloads";

export type DatasetDownloadFormat = "csv" | "json";

interface DatasetDownload {
  fileName: string;
  contents: string;
  mimeType: string;
}

export function buildDatasetDownload(
  dataset: SessionDataset,
  format: DatasetDownloadFormat,
): DatasetDownload {
  const fileName = `${buildDatasetFileStem(dataset)}.${format}`;

  if (format === "json") {
    return {
      fileName,
      contents: recordsToJson(dataset.records),
      mimeType: "application/json;charset=utf-8",
    };
  }

  return {
    fileName,
    contents: recordsToCsv(toCsvRecords(dataset.records)),
    mimeType: "text/csv;charset=utf-8",
  };
}

export function downloadSessionDataset(dataset: SessionDataset, format: DatasetDownloadFormat) {
  const download = buildDatasetDownload(dataset, format);

  downloadTextFile(download.fileName, download.contents, download.mimeType);
}

function buildDatasetFileStem(dataset: SessionDataset): string {
  return [
    dataset.reportId ?? "session",
    dataset.name,
    dataset.periodRole ?? "upload",
    dataset.loadedAt.slice(0, 10),
  ]
    .map(sanitizeFileNamePart)
    .join("-");
}

function toCsvRecords(records: unknown[]): Record<string, unknown>[] {
  return records.map((record) => (isRecord(record) ? record : { value: record }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeFileNamePart(value: string): string {
  return value.trim().replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "dataset";
}
