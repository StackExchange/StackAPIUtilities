# Scoped Report Runs, Comparisons, And Dataset Management Design

## Goal

Add report scope controls so live API runs do not always pull all available data, then make the resulting session datasets inspectable and useful for period-over-period dashboards.

The approved direction is a report-first workspace: users stay focused on one report, define scope before running it, and inspect collected datasets from a dedicated Datasets panel.

## Primary User Workflow

1. User selects a report from the catalog.
2. User sets a scope for the current period:
   - start date
   - end date
   - page size
   - max pages per dataset
3. User optionally enables a comparison period with its own start and end dates.
4. User runs the current period, comparison period, or both.
5. The app stores each run as a session-only snapshot with scope metadata.
6. The report dashboard shows current metrics, and when a comparison snapshot exists, period deltas.
7. The Datasets panel lets the user inspect, preview, reuse, and remove session datasets.

## Report Scope

Scope is explicit and session-only. It travels from the client to `/api/reports/run`, then into the live collectors.

The initial scope shape is:

```ts
interface ReportRunScope {
  current: PeriodScope;
  comparison?: PeriodScope;
  pageSize: number;
  maxPagesPerDataset: number;
}

interface PeriodScope {
  startDate?: string;
  endDate?: string;
}
```

Date fields use `YYYY-MM-DD`. Empty dates mean no date filter for that side of the period. The UI should label this clearly so users understand when they are asking for all available history.

The first implementation should not add report-specific filters such as tag, user, or department. Those can build on the same scope model later.

## Collector Behavior

Collectors receive scope and translate it into API query parameters where the underlying endpoint supports time filtering.

Initial behavior:

- `pageSize` maps to the `pagesize` query parameter.
- `maxPagesPerDataset` stops pagination after the configured number of pages.
- Date ranges map to endpoint-supported parameters such as `fromdate` and `todate` for Stack API v2.3 datasets.
- V3 endpoints that do not support equivalent date filters still respect page size and max pages.
- Synthetic datasets, such as `interactions`, inherit the source datasets from the same scoped run.

If a dataset cannot apply part of the scope, the run should still complete and attach a warning message to the result. The warning belongs in the run status and dataset metadata.

## Session Data Model

Session state should store scoped run snapshots, not only the latest flattened report output.

Recommended model additions:

```ts
type RunPeriodRole = "current" | "comparison";

interface ReportRunSnapshot {
  id: string;
  reportId: ReportId;
  periodRole: RunPeriodRole;
  scope: PeriodScope;
  pageSize: number;
  maxPagesPerDataset: number;
  datasets: LiveReportDataset[];
  createdAt: string;
  warnings: ReportWarning[];
}
```

`SessionDataset` should also carry:

- stable snapshot id
- report id
- period role
- scope metadata
- source
- record count
- collected/imported timestamp

The app can still keep a selected report output for convenience, but dashboards should be able to derive their current and comparison views from snapshots.

## UI Design

### Report Workspace

Add a scope panel above the run controls.

Controls:

- current period start date
- current period end date
- comparison period toggle
- comparison period start date
- comparison period end date
- page size input
- max pages per dataset input

Actions:

- Run current period
- Run comparison period, shown when comparison is enabled
- Run both periods, shown when comparison is enabled

The existing "Run selected reports" disabled button can stay out of scope for this slice.

### Datasets Panel

Add `Datasets` to top-level navigation.

The panel should show a dense table of session datasets:

- dataset name
- report
- period role
- date range
- source
- record count
- collected/imported timestamp
- warnings count

Dataset actions:

- inspect preview
- remove from session

Dataset reuse can appear in the data model now, but does not need a full UI in the first slice.

### Dashboards

Dashboards should become more informative in two stages.

First stage:

- show current-period metric cards
- show comparison-period metric cards when available
- show simple delta cards for shared numeric metrics
- show dataset scope and freshness near the dashboard header

Later stage:

- report-specific comparison sections
- trend tables or charts
- richer report-specific insights based on script parity

## API Contract

`POST /api/reports/run` should accept:

```ts
interface ReportRunRequestPayload {
  reportId: ReportId;
  credentials: SessionCredentials;
  periodRole: RunPeriodRole;
  scope: PeriodScope;
  pageSize: number;
  maxPagesPerDataset: number;
}
```

The response should include:

- report id and title
- period role
- scope metadata
- datasets
- messages
- warnings

The client is responsible for issuing two requests when the user chooses "Run both periods." This keeps the route simple and makes partial success easier to show.

## Error Handling

- Invalid page size or max pages should fail client-side before the request.
- Invalid dates should fail client-side before the request.
- End date before start date should fail client-side before the request.
- Server-side validation should return a structured `400` if scope fields are invalid.
- Collector warnings should not fail the whole run unless the requested dataset cannot be collected at all.
- Failed current and comparison runs should be reported independently.

## Testing Plan

Unit tests:

- scope validation accepts defaults and rejects invalid dates/page limits
- API route rejects invalid scope payloads
- live runner passes page size and max page limits to collectors
- v2 client stops pagination at max pages
- session reducer stores current and comparison snapshots separately
- dataset panel renders session inventory and remove action
- dashboard comparison delta cards render when both snapshots exist

E2E tests:

- user enters credentials, sets current scope, runs a report, and sees scoped datasets
- user enables comparison, runs both periods, and sees dashboard deltas
- user opens Datasets panel and inspects the collected dataset inventory

## Non-Goals

- Persistent storage across browser sessions.
- Report-specific tag/user/department filters.
- Batch running multiple selected reports.
- Full dataset warehouse workflow.
- Perfect Python script parity for every dashboard metric.

## Implementation Slices

1. Add scope types, validation, and API payload support.
2. Add pagination limits and query parameter translation in API clients/collectors.
3. Add report workspace scope controls and current/comparison run actions.
4. Store current and comparison run snapshots in session state.
5. Add the Datasets panel with inspection and removal.
6. Add generic dashboard comparison cards and scope/freshness context.
7. Add report-specific comparison improvements incrementally.
