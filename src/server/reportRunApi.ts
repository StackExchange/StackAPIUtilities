import { runLiveReport, type LiveReportRunResult } from "../collectors/liveReportRunner";
import { DEFAULT_REPORT_RUN_SCOPE, validateReportRunScope } from "../domain/reportScope";
import type { PeriodScope, ReportId, RunPeriodRole, SessionCredentials } from "../domain/types";

interface ReportRunRequestPayload {
  reportId: ReportId;
  credentials: SessionCredentials;
  periodRole?: RunPeriodRole;
  scope?: PeriodScope;
  pageSize?: number;
  maxPagesPerDataset?: number;
}

interface ReportRunDependencies {
  runLiveReport?: (
    reportId: ReportId,
    credentials: SessionCredentials,
    options: {
      periodRole: RunPeriodRole;
      scope: PeriodScope;
      pageSize: number;
      maxPagesPerDataset: number;
    },
  ) => Promise<LiveReportRunResult>;
}

export type ReportRunResponseBody =
  | { ok: true; result: LiveReportRunResult }
  | { ok: false; error: string };

export async function handleReportRunRequest(
  payload: unknown,
  dependencies: ReportRunDependencies = {},
): Promise<Response> {
  if (!isReportRunRequestPayload(payload)) {
    return jsonResponse(
      { ok: false, error: "Report run request requires a reportId and credentials." },
      400,
    );
  }

  const periodRole = payload.periodRole ?? "current";
  const scope = payload.scope ?? {};
  const pageSize = payload.pageSize ?? DEFAULT_REPORT_RUN_SCOPE.pageSize;
  const maxPagesPerDataset = payload.maxPagesPerDataset ?? DEFAULT_REPORT_RUN_SCOPE.maxPagesPerDataset;
  const validation = validateReportRunScope({
    current: scope,
    pageSize,
    maxPagesPerDataset,
  });

  if (!validation.valid) {
    return jsonResponse({ ok: false, error: validation.messages.join(" ") }, 400);
  }

  try {
    const result = await (dependencies.runLiveReport ?? runLiveReport)(
      payload.reportId,
      payload.credentials,
      {
        periodRole,
        scope,
        pageSize,
        maxPagesPerDataset,
      },
    );

    return jsonResponse({ ok: true, result }, 200);
  } catch (error) {
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
}

function isReportRunRequestPayload(value: unknown): value is ReportRunRequestPayload {
  if (!isRecord(value) || typeof value.reportId !== "string" || !isRecord(value.credentials)) {
    return false;
  }

  if (value.periodRole !== undefined && value.periodRole !== "current" && value.periodRole !== "comparison") {
    return false;
  }

  if (value.scope !== undefined && !isRecord(value.scope)) {
    return false;
  }

  return typeof value.credentials.instanceType === "string" && typeof value.credentials.baseUrl === "string";
}

function jsonResponse(body: ReportRunResponseBody, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
