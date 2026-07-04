import type { DatasetName } from "../domain/types";

export interface LiveCollectorClients {
  v2: DatasetClient;
  v3: DatasetClient;
}

export interface DatasetClient {
  getPagedItems(path: string, query?: Record<string, string>): Promise<unknown[]>;
}

export interface LiveCollectorContext {
  collectedDatasets?: Partial<Record<DatasetName, Record<string, unknown>[]>>;
}

interface LiveDatasetEndpoint {
  client: keyof LiveCollectorClients;
  path: string;
}

const liveDatasetEndpoints: Partial<Record<DatasetName, LiveDatasetEndpoint>> = {
  users: { client: "v2", path: "/users" },
  tags: { client: "v2", path: "/tags" },
  questions: { client: "v2", path: "/questions" },
  answers: { client: "v2", path: "/answers" },
  comments: { client: "v2", path: "/comments" },
  articles: { client: "v2", path: "/articles" },
  communities: { client: "v3", path: "/communities" },
  userGroups: { client: "v3", path: "/user-groups" },
};

const dependentLiveDatasets = new Set<DatasetName>(["tagSmes", "reputationHistory"]);

export class UnsupportedLiveDatasetError extends Error {
  constructor(public readonly dataset: DatasetName) {
    super(`Dataset ${dataset} is not mapped for live API collection yet.`);
  }
}

export function isLiveDatasetCollectable(dataset: DatasetName): boolean {
  return dataset in liveDatasetEndpoints || dependentLiveDatasets.has(dataset);
}

export function getUnsupportedLiveDatasets(datasets: readonly DatasetName[]): DatasetName[] {
  return datasets.filter((dataset) => !isLiveDatasetCollectable(dataset));
}

export async function collectDataset(
  dataset: DatasetName,
  clients: LiveCollectorClients,
  context: LiveCollectorContext = {},
): Promise<unknown[]> {
  if (dataset === "tagSmes") {
    return collectTagSmes(clients, getCollectedDataset(context, "tags"));
  }

  if (dataset === "reputationHistory") {
    return collectReputationHistory(clients, getCollectedDataset(context, "users"));
  }

  const endpoint = liveDatasetEndpoints[dataset];

  if (!endpoint) {
    throw new UnsupportedLiveDatasetError(dataset);
  }

  return clients[endpoint.client].getPagedItems(endpoint.path, { pagesize: "100" });
}

async function collectTagSmes(
  clients: LiveCollectorClients,
  tags: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  const records: Record<string, unknown>[] = [];

  for (const tagName of uniqueValues(tags.map(getTagName))) {
    const tagScores = await clients.v2.getPagedItems(
      `/tags/${encodeURIComponent(tagName)}/top-answerers/all_time`,
      { pagesize: "100" },
    );

    records.push(...toRecordList(tagScores).map((record) => ({ tagName, ...record })));
  }

  return records;
}

async function collectReputationHistory(
  clients: LiveCollectorClients,
  users: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  const records: Record<string, unknown>[] = [];
  const userIds = uniqueValues(users.map((user) => getNumberField(user, "user_id", "userId", "id")));

  for (const userIdBatch of chunk(userIds, 100)) {
    const reputationEvents = await clients.v2.getPagedItems(
      `/users/${userIdBatch.join(";")}/reputation-history`,
      { pagesize: "100" },
    );

    records.push(...toRecordList(reputationEvents));
  }

  return records;
}

function getCollectedDataset(
  context: LiveCollectorContext,
  dataset: DatasetName,
): Record<string, unknown>[] {
  return context.collectedDatasets?.[dataset] ?? [];
}

function getTagName(tag: Record<string, unknown>): string | null {
  const value = tag.name ?? tag.tagName ?? tag.tag_name;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function getNumberField(record: Record<string, unknown>, ...fieldNames: string[]): number | null {
  for (const fieldName of fieldNames) {
    const value = record[fieldName];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function uniqueValues<T extends string | number>(values: (T | null)[]): T[] {
  return [...new Set(values.filter((value): value is T => value !== null))];
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function toRecordList(records: unknown[]): Record<string, unknown>[] {
  return records.map((record) => {
    if (typeof record === "object" && record !== null && !Array.isArray(record)) {
      return record as Record<string, unknown>;
    }

    return { value: record };
  });
}
