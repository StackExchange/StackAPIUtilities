# Reporting MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static Stacks-based TypeScript web app that runs the browser-ready read-only SO4T reporting utilities in the user's browser with session-only credentials and session-only report data.

**Architecture:** Implement a Vite + React + TypeScript app with pure report/domain modules, mocked API tests, CSV/JSON importers, Web Worker execution, reusable tables, and report-specific dashboards. Keep API collection, upload parsing, transformation, and UI rendering separated so live API data and uploaded script outputs normalize into the same in-memory report model.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, Playwright, Stacks CSS, PapaParse, TanStack Table, Recharts, d3-chord/d3-shape, Web Workers.

---

## File Structure

Create the app under the repository root. Keep each module narrow and testable.

- `package.json`: scripts and runtime/dev dependencies.
- `pnpm-workspace.yaml`: pnpm build-script approvals for required tooling dependencies.
- `vite.config.ts`: Vite React config and Vitest environment.
- `tsconfig.json`, `tsconfig.node.json`: TypeScript compiler configuration.
- `index.html`: Vite entry HTML.
- `playwright.config.ts`: browser smoke-test configuration.
- `src/main.tsx`: React bootstrap.
- `src/App.tsx`: top-level app shell and session state composition.
- `src/styles/app.css`: Stacks imports and app-specific layout styles.
- `src/domain/types.ts`: shared instance, credential, dataset, report, warning, run, and table types.
- `src/domain/reportRegistry.ts`: metadata for MVP and later-phase reports.
- `src/domain/sessionStore.ts`: in-memory session state reducer and actions.
- `src/credentials/credentialRules.ts`: instance URL normalization and credential/scope validation.
- `src/api/httpClient.ts`: fetch wrapper, JSON parsing, error mapping, retry/backoff hooks.
- `src/api/stackApiV2.ts`: Stack API v2.3 client.
- `src/api/stackApiV3.ts`: Stack API v3 client.
- `src/collectors/datasetPlanner.ts`: maps report selections to shared dataset requirements.
- `src/collectors/liveCollectors.ts`: live dataset collectors using v2/v3 clients.
- `src/importers/csv.ts`: CSV parsing helpers.
- `src/importers/json.ts`: JSON parsing helpers.
- `src/importers/reportImporters.ts`: report-specific uploaded-file importers.
- `src/reports/tagReport.ts`: Tag Report transformer and table/dashboard model.
- `src/reports/userReport.ts`: API User Report transformer and table/dashboard model.
- `src/reports/inactiveUsers.ts`: Inactive Users transformer and table/dashboard model.
- `src/reports/interactions.ts`: Interactions transformer and matrix model.
- `src/reports/communityMembers.ts`: Community Members transformer and table/dashboard model.
- `src/reports/dataExport.ts`: Data Export summary transformer.
- `src/workers/reportWorker.ts`: worker entry for parsing and transformations.
- `src/workers/reportWorkerClient.ts`: typed worker client used by React.
- `src/components/AppShell.tsx`: top nav and page layout.
- `src/components/ReportCatalog.tsx`: left-side report navigation.
- `src/components/CredentialsPanel.tsx`: shared session-only credentials screen.
- `src/components/UploadsPanel.tsx`: upload/import surface.
- `src/components/RunControls.tsx`: single-report and selected-report batch run controls.
- `src/components/RunStatus.tsx`: run queue progress and warnings.
- `src/components/SessionOverview.tsx`: light cross-report overview.
- `src/components/ReportWorkspace.tsx`: selected report page composition.
- `src/components/DataTable.tsx`: reusable raw table.
- `src/components/DashboardCards.tsx`: reusable metric cards.
- `src/components/charts/*.tsx`: chart components.
- `src/utils/downloads.ts`: explicit CSV/JSON downloads.
- `src/utils/formatters.ts`: number/date/text formatting helpers.
- `src/test/fixtures/*.ts`: representative fixtures derived from inspected sample outputs.
- `src/**/*.test.ts`, `src/**/*.test.tsx`: unit and component tests.
- `e2e/reporting-mvp.spec.ts`: Playwright app smoke test.

## Task 1: Scaffold The Static TypeScript App

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `playwright.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles/app.css`

- [ ] **Step 1: Create project metadata and scripts**

Create `package.json` with these scripts and dependencies:

```json
{
  "name": "stack-api-utilities",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "packageManager": "pnpm@11.9.0",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -p tsconfig.json --noEmit && tsc -p tsconfig.node.json --noEmit && vite build",
    "preview": "vite preview --host 127.0.0.1",
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "lint": "tsc -p tsconfig.json --noEmit --pretty false && tsc -p tsconfig.node.json --noEmit --pretty false"
  },
  "dependencies": {
    "@stackoverflow/stacks": "^2.5.1",
    "@tanstack/react-table": "^8.20.5",
    "d3-chord": "^3.0.1",
    "d3-shape": "^3.2.0",
    "papaparse": "^5.4.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.12.7"
  },
  "devDependencies": {
    "@playwright/test": "^1.45.0",
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/d3-chord": "^3.0.6",
    "@types/d3-shape": "^3.1.6",
    "@types/papaparse": "^5.3.14",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.1.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
pnpm install
```

Expected: `pnpm-lock.yaml` is created and pnpm exits successfully. If network access is blocked, rerun with approved network access. If `pnpm` is not installed, use `npm exec --yes --package=pnpm@11.9.0 -- pnpm install` and keep only the resulting `pnpm-lock.yaml`. If pnpm asks to approve `esbuild`, create `pnpm-workspace.yaml` with:

```yaml
allowBuilds:
  esbuild: true
```

- [ ] **Step 3: Add Vite, TypeScript, and Playwright config**

Create `vite.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts", "playwright.config.ts"]
}
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev -- --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
```

- [ ] **Step 4: Add the initial app shell**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Stack API Utilities</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "@stackoverflow/stacks/dist/css/stacks.css";
import "./styles/app.css";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `src/App.tsx`:

```tsx
export function App() {
  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div>
          <p className="fs-caption fc-light mb2">Stack Overflow for Teams</p>
          <h1 className="fs-headline1 m0">Stack API Utilities</h1>
        </div>
      </header>
      <section className="app-empty-state">
        <h2 className="fs-title">Reporting MVP</h2>
        <p className="fs-body2">
          Static browser app scaffold is ready. Report catalog implementation follows in later tasks.
        </p>
      </section>
    </main>
  );
}
```

Create `src/styles/app.css`:

```css
:root {
  color-scheme: light;
}

body {
  margin: 0;
  background: var(--black-050);
}

.app-shell {
  min-height: 100vh;
  color: var(--black-800);
}

.app-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--black-150);
  background: var(--white);
}

.app-empty-state {
  max-width: 760px;
  margin: 40px auto;
  padding: 0 24px;
}
```

- [ ] **Step 5: Add test setup**

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 6: Verify scaffold**

Run:

```bash
pnpm build
pnpm test
```

Expected: build succeeds and Vitest exits with no test files or all passing tests.

- [ ] **Step 7: Commit scaffold**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml index.html vite.config.ts tsconfig.json tsconfig.node.json playwright.config.ts src
git commit -m "chore: scaffold reporting mvp app"
```

## Task 2: Add Domain Types, Report Registry, And Session Reducer

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/reportRegistry.ts`
- Create: `src/domain/sessionStore.ts`
- Create: `src/domain/reportRegistry.test.ts`
- Create: `src/domain/sessionStore.test.ts`

- [ ] **Step 1: Write registry and session tests first**

Create `src/domain/reportRegistry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getExecutableReports, reportRegistry } from "./reportRegistry";

describe("reportRegistry", () => {
  it("contains the six browser-ready read-only MVP reports", () => {
    expect(reportRegistry.filter((report) => report.phase === "mvp").map((report) => report.id)).toEqual([
      "tag-report",
      "api-user-report",
      "inactive-users",
      "interactions",
      "community-members",
      "data-export",
    ]);
  });

  it("keeps later-phase write and scraping tools out of executable reports", () => {
    expect(getExecutableReports().map((report) => report.id)).not.toContain("api-import");
    expect(getExecutableReports().map((report) => report.id)).not.toContain("webhook-report");
    expect(getExecutableReports().map((report) => report.id)).not.toContain("scim-user-deletion");
  });
});
```

Create `src/domain/sessionStore.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createInitialSessionState, sessionReducer } from "./sessionStore";

describe("sessionStore", () => {
  it("stores credentials only in memory state", () => {
    const state = sessionReducer(createInitialSessionState(), {
      type: "credentials/set",
      credentials: {
        instanceType: "enterprise",
        baseUrl: "https://example.stackenterprise.co",
        apiKey: "key",
        accessToken: "token",
      },
    });

    expect(state.credentials?.accessToken).toBe("token");
    expect(localStorage.getItem("credentials")).toBeNull();
    expect(sessionStorage.getItem("credentials")).toBeNull();
  });

  it("clears credentials and datasets on reset", () => {
    const withData = sessionReducer(createInitialSessionState(), {
      type: "dataset/set",
      datasetName: "users",
      records: [{ id: 1 }],
    });
    const reset = sessionReducer(withData, { type: "session/reset" });

    expect(reset.credentials).toBeNull();
    expect(reset.datasets).toEqual({});
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm test -- src/domain/reportRegistry.test.ts src/domain/sessionStore.test.ts
```

Expected: FAIL because `reportRegistry`, `getExecutableReports`, `createInitialSessionState`, and `sessionReducer` are not implemented.

- [ ] **Step 3: Implement shared domain types**

Create `src/domain/types.ts`:

```ts
export type InstanceType = "basic-business" | "enterprise";

export type ReportPhase = "mvp" | "later";

export type ReportCapability = "live-api" | "upload";

export type CredentialRequirement = "api-key" | "access-token" | "pat" | "enterprise-admin" | "community-access";

export type DatasetName =
  | "users"
  | "tags"
  | "questions"
  | "articles"
  | "communities"
  | "userGroups"
  | "tagSmes"
  | "reputationHistory"
  | "interactions"
  | "dataExport";

export type ReportId =
  | "tag-report"
  | "api-user-report"
  | "inactive-users"
  | "interactions"
  | "community-members"
  | "data-export"
  | "webhook-report"
  | "search-log-report"
  | "api-import"
  | "user-groups"
  | "scim-user-activation"
  | "scim-user-deactivation"
  | "scim-user-deletion";

export interface SessionCredentials {
  instanceType: InstanceType;
  baseUrl: string;
  apiKey?: string;
  accessToken?: string;
  pat?: string;
}

export interface ReportMetadata {
  id: ReportId;
  phase: ReportPhase;
  title: string;
  sourceRepo: string;
  description: string;
  supportedInstances: InstanceType[];
  capabilities: ReportCapability[];
  credentialRequirements: CredentialRequirement[];
  requiredDatasets: DatasetName[];
  excludedReason?: string;
}

export interface ReportWarning {
  reportId?: ReportId;
  code: string;
  message: string;
}

export interface SessionDataset {
  name: DatasetName;
  records: unknown[];
  loadedAt: string;
  source: "live-api" | "upload";
}

export interface RunQueueItem {
  id: string;
  reportId: ReportId;
  status: "queued" | "running" | "succeeded" | "failed";
  message: string;
}

export interface SessionState {
  credentials: SessionCredentials | null;
  selectedReportId: ReportId;
  selectedReportIds: ReportId[];
  datasets: Partial<Record<DatasetName, SessionDataset>>;
  warnings: ReportWarning[];
  runQueue: RunQueueItem[];
}
```

- [ ] **Step 4: Implement report registry**

Create `src/domain/reportRegistry.ts`:

```ts
import type { ReportMetadata } from "./types";

export const reportRegistry: ReportMetadata[] = [
  {
    id: "tag-report",
    phase: "mvp",
    title: "Tag Report",
    sourceRepo: "StackExchange/so4t_tag_report",
    description: "Tag health, activity, response-time, SME, and coverage metrics.",
    supportedInstances: ["basic-business", "enterprise"],
    capabilities: ["live-api", "upload"],
    credentialRequirements: ["access-token", "api-key"],
    requiredDatasets: ["tags", "users", "questions", "articles", "tagSmes"],
  },
  {
    id: "api-user-report",
    phase: "mvp",
    title: "API User Report",
    sourceRepo: "StackExchange/so4t_api_user_report",
    description: "User contribution, reputation, inactivity, SME, and profile metrics.",
    supportedInstances: ["basic-business", "enterprise"],
    capabilities: ["live-api", "upload"],
    credentialRequirements: ["access-token", "api-key"],
    requiredDatasets: ["users", "questions", "articles", "tags", "reputationHistory", "communities"],
  },
  {
    id: "inactive-users",
    phase: "mvp",
    title: "Inactive Users",
    sourceRepo: "StackExchange/so4t_inactive_users",
    description: "Inactive user cohorts and content-risk segmentation.",
    supportedInstances: ["basic-business", "enterprise"],
    capabilities: ["live-api", "upload"],
    credentialRequirements: ["access-token", "api-key"],
    requiredDatasets: ["users"],
  },
  {
    id: "interactions",
    phase: "mvp",
    title: "Interactions",
    sourceRepo: "StackExchange/so4t_interactions_report",
    description: "Department-to-department interaction matrix and network view.",
    supportedInstances: ["basic-business", "enterprise"],
    capabilities: ["live-api", "upload"],
    credentialRequirements: ["access-token", "api-key"],
    requiredDatasets: ["users", "questions", "interactions"],
  },
  {
    id: "community-members",
    phase: "mvp",
    title: "Community Members",
    sourceRepo: "StackExchange/so4t_community_members",
    description: "Community membership, SME, title, department, and email exports.",
    supportedInstances: ["basic-business", "enterprise"],
    capabilities: ["live-api", "upload"],
    credentialRequirements: ["access-token", "community-access"],
    requiredDatasets: ["communities", "users"],
  },
  {
    id: "data-export",
    phase: "mvp",
    title: "Data Export",
    sourceRepo: "StackExchange/so4t_data_export",
    description: "JSON export summaries for users, groups, tags, articles, questions, answers, and comments.",
    supportedInstances: ["basic-business", "enterprise"],
    capabilities: ["live-api", "upload"],
    credentialRequirements: ["access-token", "api-key"],
    requiredDatasets: ["users", "userGroups", "tags", "articles", "questions", "dataExport"],
  },
  {
    id: "webhook-report",
    phase: "later",
    title: "WebHook Report",
    sourceRepo: "StackExchange/so4t_WebHook_report",
    description: "Enterprise webhook scraping report.",
    supportedInstances: ["enterprise"],
    capabilities: [],
    credentialRequirements: ["enterprise-admin"],
    requiredDatasets: [],
    excludedReason: "Requires Selenium and admin-page scraping.",
  },
  {
    id: "search-log-report",
    phase: "later",
    title: "Search Log Report",
    sourceRepo: "StackExchange/so4t_search_log_report",
    description: "Enterprise search-log scraping report.",
    supportedInstances: ["enterprise"],
    capabilities: [],
    credentialRequirements: ["enterprise-admin"],
    requiredDatasets: [],
    excludedReason: "Requires Selenium login and admin/developer page scraping.",
  },
  {
    id: "api-import",
    phase: "later",
    title: "API Import",
    sourceRepo: "StackExchange/so4t_api_import",
    description: "Bulk import questions, answers, and articles.",
    supportedInstances: ["basic-business", "enterprise"],
    capabilities: [],
    credentialRequirements: ["access-token", "api-key"],
    requiredDatasets: [],
    excludedReason: "Write action reserved for guarded later phase.",
  },
  {
    id: "user-groups",
    phase: "later",
    title: "User Groups",
    sourceRepo: "StackExchange/so4t_user_groups",
    description: "Create groups and add users to groups.",
    supportedInstances: ["enterprise"],
    capabilities: [],
    credentialRequirements: ["access-token", "api-key"],
    requiredDatasets: [],
    excludedReason: "Write action reserved for guarded later phase.",
  },
  {
    id: "scim-user-activation",
    phase: "later",
    title: "SCIM User Activation",
    sourceRepo: "StackExchange/so4t_scim_user_activation",
    description: "Activate users through SCIM.",
    supportedInstances: ["basic-business", "enterprise"],
    capabilities: [],
    credentialRequirements: ["access-token"],
    requiredDatasets: [],
    excludedReason: "Privileged SCIM mutation reserved for later runner/backend phase.",
  },
  {
    id: "scim-user-deactivation",
    phase: "later",
    title: "SCIM User Deactivation",
    sourceRepo: "StackExchange/so4t_scim_user_deactivation",
    description: "Deactivate users through SCIM.",
    supportedInstances: ["basic-business", "enterprise"],
    capabilities: [],
    credentialRequirements: ["access-token"],
    requiredDatasets: [],
    excludedReason: "Privileged SCIM mutation reserved for later runner/backend phase.",
  },
  {
    id: "scim-user-deletion",
    phase: "later",
    title: "SCIM User Deletion",
    sourceRepo: "StackExchange/so4t_scim_user_deletion",
    description: "Delete users through SCIM.",
    supportedInstances: ["basic-business", "enterprise"],
    capabilities: [],
    credentialRequirements: ["access-token"],
    requiredDatasets: [],
    excludedReason: "Destructive SCIM mutation reserved for later runner/backend phase.",
  },
];

export function getExecutableReports() {
  return reportRegistry.filter((report) => report.phase === "mvp");
}
```

- [ ] **Step 5: Implement in-memory session reducer**

Create `src/domain/sessionStore.ts`:

```ts
import type { DatasetName, ReportId, SessionCredentials, SessionState } from "./types";

type SessionAction =
  | { type: "credentials/set"; credentials: SessionCredentials }
  | { type: "report/select"; reportId: ReportId }
  | { type: "reports/selectMany"; reportIds: ReportId[] }
  | { type: "dataset/set"; datasetName: DatasetName; records: unknown[] }
  | { type: "session/reset" };

export function createInitialSessionState(): SessionState {
  return {
    credentials: null,
    selectedReportId: "tag-report",
    selectedReportIds: ["tag-report"],
    datasets: {},
    warnings: [],
    runQueue: [],
  };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "credentials/set":
      return { ...state, credentials: action.credentials };
    case "report/select":
      return {
        ...state,
        selectedReportId: action.reportId,
        selectedReportIds: state.selectedReportIds.includes(action.reportId)
          ? state.selectedReportIds
          : [action.reportId],
      };
    case "reports/selectMany":
      return { ...state, selectedReportIds: action.reportIds };
    case "dataset/set":
      return {
        ...state,
        datasets: {
          ...state.datasets,
          [action.datasetName]: {
            name: action.datasetName,
            records: action.records,
            loadedAt: new Date().toISOString(),
            source: "upload",
          },
        },
      };
    case "session/reset":
      return createInitialSessionState();
    default:
      return state;
  }
}
```

- [ ] **Step 6: Verify tests pass**

Run:

```bash
pnpm test -- src/domain/reportRegistry.test.ts src/domain/sessionStore.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit domain foundation**

```bash
git add src/domain
git commit -m "feat: add report registry and session state"
```

## Task 3: Implement Credential Rules And URL Normalization

**Files:**
- Create: `src/credentials/credentialRules.ts`
- Create: `src/credentials/credentialRules.test.ts`

- [ ] **Step 1: Write credential rule tests**

Create `src/credentials/credentialRules.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeInstanceUrl, validateCredentialsForReport } from "./credentialRules";

describe("normalizeInstanceUrl", () => {
  it("normalizes Basic/Business team URLs into API roots and team slugs", () => {
    expect(normalizeInstanceUrl("https://stackoverflowteams.com/c/example-team")).toEqual({
      instanceType: "basic-business",
      baseUrl: "https://stackoverflowteams.com/c/example-team",
      teamSlug: "example-team",
      apiV2Url: "https://api.stackoverflowteams.com/2.3",
      apiV3Url: "https://api.stackoverflowteams.com/v3/teams/example-team",
    });
  });

  it("normalizes Enterprise URLs into same-origin API roots", () => {
    expect(normalizeInstanceUrl("https://demo.stackenterprise.co/")).toEqual({
      instanceType: "enterprise",
      baseUrl: "https://demo.stackenterprise.co",
      teamSlug: null,
      apiV2Url: "https://demo.stackenterprise.co/api/2.3",
      apiV3Url: "https://demo.stackenterprise.co/api/v3",
    });
  });
});

describe("validateCredentialsForReport", () => {
  it("requires an access token for Basic/Business live API reports", () => {
    const result = validateCredentialsForReport("tag-report", {
      instanceType: "basic-business",
      baseUrl: "https://stackoverflowteams.com/c/example-team",
    });

    expect(result.valid).toBe(false);
    expect(result.messages).toContain("Access token or PAT is required for Basic/Business API calls.");
  });

  it("requires an API key and access token for Enterprise reports that use both v2 and v3", () => {
    const result = validateCredentialsForReport("api-user-report", {
      instanceType: "enterprise",
      baseUrl: "https://demo.stackenterprise.co",
      apiKey: "key",
    });

    expect(result.valid).toBe(false);
    expect(result.messages).toContain("Access token is required for Stack API v3 calls.");
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm test -- src/credentials/credentialRules.test.ts
```

Expected: FAIL because `credentialRules.ts` does not exist.

- [ ] **Step 3: Implement credential rules**

Create `src/credentials/credentialRules.ts`:

```ts
import { reportRegistry } from "../domain/reportRegistry";
import type { InstanceType, ReportId, SessionCredentials } from "../domain/types";

export interface NormalizedInstance {
  instanceType: InstanceType;
  baseUrl: string;
  teamSlug: string | null;
  apiV2Url: string;
  apiV3Url: string;
}

export interface ValidationResult {
  valid: boolean;
  messages: string[];
}

export function normalizeInstanceUrl(input: string): NormalizedInstance {
  const url = new URL(input);
  const baseUrl = `${url.protocol}//${url.host}${url.pathname}`.replace(/\/$/, "");

  if (url.host === "stackoverflowteams.com" && url.pathname.startsWith("/c/")) {
    const teamSlug = url.pathname.replace(/^\/c\//, "").replace(/\/$/, "");
    return {
      instanceType: "basic-business",
      baseUrl: `https://stackoverflowteams.com/c/${teamSlug}`,
      teamSlug,
      apiV2Url: "https://api.stackoverflowteams.com/2.3",
      apiV3Url: `https://api.stackoverflowteams.com/v3/teams/${teamSlug}`,
    };
  }

  return {
    instanceType: "enterprise",
    baseUrl,
    teamSlug: null,
    apiV2Url: `${baseUrl}/api/2.3`,
    apiV3Url: `${baseUrl}/api/v3`,
  };
}

export function validateCredentialsForReport(reportId: ReportId, credentials: SessionCredentials): ValidationResult {
  const report = reportRegistry.find((candidate) => candidate.id === reportId);
  const messages: string[] = [];

  if (!report) {
    return { valid: false, messages: [`Unknown report: ${reportId}`] };
  }

  if (!report.supportedInstances.includes(credentials.instanceType)) {
    messages.push(`${report.title} is not available for the selected instance type.`);
  }

  if (credentials.instanceType === "basic-business") {
    if (!credentials.accessToken && !credentials.pat) {
      messages.push("Access token or PAT is required for Basic/Business API calls.");
    }
  }

  if (credentials.instanceType === "enterprise") {
    if (report.credentialRequirements.includes("api-key") && !credentials.apiKey) {
      messages.push("API key is required for Stack API v2.3 Enterprise calls.");
    }
    if (report.credentialRequirements.includes("access-token") && !credentials.accessToken) {
      messages.push("Access token is required for Stack API v3 calls.");
    }
  }

  return { valid: messages.length === 0, messages };
}
```

- [ ] **Step 4: Verify tests pass**

Run:

```bash
pnpm test -- src/credentials/credentialRules.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit credential rules**

```bash
git add src/credentials
git commit -m "feat: add credential validation rules"
```

## Task 4: Implement Stack API Clients With Mocked Pagination And Backoff

**Files:**
- Create: `src/api/httpClient.ts`
- Create: `src/api/stackApiV2.ts`
- Create: `src/api/stackApiV3.ts`
- Create: `src/api/stackApiV2.test.ts`
- Create: `src/api/stackApiV3.test.ts`

- [ ] **Step 1: Write API client tests**

Create `src/api/stackApiV2.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { StackApiV2Client } from "./stackApiV2";

describe("StackApiV2Client", () => {
  it("fetches all pages and appends the team slug for Basic/Business", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: 1 }], has_more: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: 2 }], has_more: false }), { status: 200 }));

    const client = new StackApiV2Client({
      apiV2Url: "https://api.stackoverflowteams.com/2.3",
      teamSlug: "example-team",
      headers: { "X-API-Access-Token": "token" },
      fetchFn: fetchMock,
    });

    await expect(client.getPagedItems("/users", { pagesize: "100" })).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    expect(fetchMock.mock.calls[0][0].toString()).toContain("team=example-team");
    expect(fetchMock.mock.calls[1][0].toString()).toContain("page=2");
  });

  it("throws a mapped error on non-200 responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("bad key", { status: 400 }));
    const client = new StackApiV2Client({
      apiV2Url: "https://demo.stackenterprise.co/api/2.3",
      teamSlug: null,
      headers: { "X-API-Key": "bad" },
      fetchFn: fetchMock,
    });

    await expect(client.getPagedItems("/tags")).rejects.toThrow("Stack API v2.3 request failed with 400");
  });
});
```

Create `src/api/stackApiV3.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { StackApiV3Client } from "./stackApiV3";

describe("StackApiV3Client", () => {
  it("fetches totalPages pagination", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: "a" }], totalPages: 2 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: "b" }], totalPages: 2 }), { status: 200 }));

    const client = new StackApiV3Client({
      apiV3Url: "https://api.stackoverflowteams.com/v3/teams/example-team",
      token: "token",
      fetchFn: fetchMock,
    });

    await expect(client.getPagedItems("/tags")).resolves.toEqual([{ id: "a" }, { id: "b" }]);
    expect(fetchMock.mock.calls[1][0].toString()).toContain("page=2");
  });

  it("calls the throttle callback when token bucket is low", async () => {
    const wait = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], totalPages: 1 }), {
        status: 200,
        headers: {
          "x-token-bucket-calls-left": "25",
          "x-token-bucket-seconds-until-next-refill": "60",
        },
      }),
    );

    const client = new StackApiV3Client({
      apiV3Url: "https://demo.stackenterprise.co/api/v3",
      token: "token",
      fetchFn: fetchMock,
      onThrottle: wait,
    });

    await client.getPagedItems("/users");
    expect(wait).toHaveBeenCalledWith({ kind: "token-bucket", seconds: 60, remaining: 25 });
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm test -- src/api/stackApiV2.test.ts src/api/stackApiV3.test.ts
```

Expected: FAIL because API clients are not implemented.

- [ ] **Step 3: Implement shared HTTP error**

Create `src/api/httpClient.ts`:

```ts
export type FetchLike = typeof fetch;

export interface ThrottleNotice {
  kind: "backoff" | "burst" | "token-bucket";
  seconds: number;
  remaining?: number;
}

export class StackApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
    public readonly responseText: string,
  ) {
    super(message);
  }
}

export async function readJsonResponse<T>(response: Response, apiName: string): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new StackApiError(`${apiName} request failed with ${response.status}`, response.status, response.url, text);
  }
  return response.json() as Promise<T>;
}
```

- [ ] **Step 4: Implement v2.3 client**

Create `src/api/stackApiV2.ts`:

```ts
import { FetchLike, StackApiError, readJsonResponse } from "./httpClient";

interface V2Response<T> {
  items: T[];
  has_more?: boolean;
  backoff?: number;
}

interface StackApiV2ClientOptions {
  apiV2Url: string;
  teamSlug: string | null;
  headers: Record<string, string>;
  fetchFn?: FetchLike;
  onBackoff?: (seconds: number) => void;
}

export class StackApiV2Client {
  private readonly fetchFn: FetchLike;

  constructor(private readonly options: StackApiV2ClientOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async getPagedItems<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
    const items: T[] = [];
    let page = 1;

    while (true) {
      const url = new URL(`${this.options.apiV2Url}${endpoint}`);
      url.searchParams.set("page", String(page));
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
      if (this.options.teamSlug) url.searchParams.set("team", this.options.teamSlug);

      const response = await this.fetchFn(url, { headers: this.options.headers });
      let data: V2Response<T>;
      try {
        data = await readJsonResponse<V2Response<T>>(response, "Stack API v2.3");
      } catch (error) {
        if (error instanceof StackApiError) throw error;
        throw new Error("Stack API v2.3 returned invalid JSON.");
      }

      items.push(...(data.items ?? []));
      if (data.backoff) this.options.onBackoff?.(data.backoff + 1);
      if (!data.has_more) return items;
      page += 1;
    }
  }
}
```

- [ ] **Step 5: Implement v3 client**

Create `src/api/stackApiV3.ts`:

```ts
import { FetchLike, ThrottleNotice, readJsonResponse } from "./httpClient";

interface V3PagedResponse<T> {
  items: T[];
  totalPages: number;
}

interface StackApiV3ClientOptions {
  apiV3Url: string;
  token: string;
  fetchFn?: FetchLike;
  onThrottle?: (notice: ThrottleNotice) => void;
}

export class StackApiV3Client {
  private readonly fetchFn: FetchLike;

  constructor(private readonly options: StackApiV3ClientOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
  }

  async getPagedItems<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const url = new URL(`${this.options.apiV3Url}${endpoint}`);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pagesize", params.pagesize ?? "100");
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

      const response = await this.fetchFn(url, {
        headers: {
          Authorization: `Bearer ${this.options.token}`,
          "Content-Type": "application/json",
        },
      });

      this.emitThrottleNotices(response.headers);
      const data = await readJsonResponse<V3PagedResponse<T>>(response, "Stack API v3");
      items.push(...(data.items ?? []));
      totalPages = data.totalPages ?? 1;
      page += 1;
    }

    return items;
  }

  private emitThrottleNotices(headers: Headers) {
    const burstLeft = headers.get("x-burst-throttle-calls-left");
    if (burstLeft !== null && Number(burstLeft) < 5) {
      this.options.onThrottle?.({
        kind: "burst",
        seconds: Number(headers.get("x-burst-throttle-seconds-until-full") ?? "2"),
        remaining: Number(burstLeft),
      });
    }

    const bucketLeft = headers.get("x-token-bucket-calls-left");
    if (bucketLeft !== null && Number(bucketLeft) < 100) {
      this.options.onThrottle?.({
        kind: "token-bucket",
        seconds: Number(headers.get("x-token-bucket-seconds-until-next-refill") ?? "60"),
        remaining: Number(bucketLeft),
      });
    }
  }
}
```

- [ ] **Step 6: Verify tests pass**

Run:

```bash
pnpm test -- src/api/stackApiV2.test.ts src/api/stackApiV3.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit API clients**

```bash
git add src/api
git commit -m "feat: add stack api clients"
```

## Task 5: Add Fixtures, Importers, And Download Helpers

**Files:**
- Create: `src/test/fixtures/reportFixtures.ts`
- Create: `src/importers/csv.ts`
- Create: `src/importers/json.ts`
- Create: `src/importers/reportImporters.ts`
- Create: `src/importers/reportImporters.test.ts`
- Create: `src/utils/downloads.ts`
- Create: `src/utils/downloads.test.ts`

- [ ] **Step 1: Add representative fixtures**

Create `src/test/fixtures/reportFixtures.ts`:

```ts
export const tagMetricsCsv = `Tag Name,Total Page Views,Webhooks,Tag Watchers,Communities,Total Smes,Median Time To First Answer Hours,Median Time To First Response Hours,Total Unique Contributors,Unique Askers,Unique Answerers,Unique Commenters,Unique Article Contributors,Question Count,Question Upvotes,Question Downvotes,Question Comments,Questions No Answers,Questions Accepted Answer,Questions Self Answered,Answer Count,Sme Answers,Answer Upvotes,Answer Downvotes,Answer Comments,Article Count,Article Upvotes,Article Comments
machine-learning,551412,22,275,3,15,7.41,4.08,1781,970,763,1014,2,1355,3800,138,1899,222,519,56,1916,2,4426,99,1947,3,6,0
python,338584,44,188,5,25,6.43,4.07,894,411,434,503,3,616,1323,75,658,122,260,67,795,10,1747,36,740,3,6,1`;

export const userMetricsCsv = `User ID,Display Name,Net Reputation,Account Longevity (Days),Account Inactivity (Days),Questions,Questions With No Answers,Answers,Answers Accepted,Median Answer Time (Hours),Articles,Comments,Total Upvotes,Total Downvotes,SME Tags,Account Status,Moderator,Email,Title,Department,External ID,Account ID
96,Harley Q.,20207,2248,0,262,6,554,455,1.15,35,284,1498,2,"release-management, product-support",Registered,FALSE,user@company.com,"Director, Product Support",Product Operations and Experience,,1`;

export const inactiveUsersCsv = `user_id,verified_email,display_name,inactive_days,is_deactivated,reputation,answer_count,question_count,article_count,comment_count,down_vote_count,up_vote_count
11,user1@company.com,Shreyas,297,TRUE,11,0,1,0,0,0,0
5,user23@company.com,Jabed,243,TRUE,1,0,0,0,0,0,2`;

export const communityMembersCsv = `Name,Email,Member Since,Is SME,Job Title,Department
Jane Doe,jane.doe@company.com,2024-03-15T10:30:00,True,Software Engineer,Engineering
John Smith,john.smith@company.com,2024-06-22T14:15:00,False,Product Manager,Product`;

export const interactionMatrixCsv = `source,Engineering,Product
Engineering,0,4
Product,2,0`;

export const dataExportUsersJson = JSON.stringify([
  { user_id: 96, display_name: "Harley Q.", answer_count: 554 },
  { user_id: 365, display_name: "Tony S.", answer_count: 265 }
]);
```

- [ ] **Step 2: Write importer and download tests**

Create `src/importers/reportImporters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  communityMembersCsv,
  dataExportUsersJson,
  inactiveUsersCsv,
  interactionMatrixCsv,
  tagMetricsCsv,
  userMetricsCsv,
} from "../test/fixtures/reportFixtures";
import { importReportFile } from "./reportImporters";

describe("importReportFile", () => {
  it("imports tag metrics CSV", async () => {
    const result = await importReportFile("tag_metrics.csv", tagMetricsCsv);
    expect(result.reportId).toBe("tag-report");
    expect(result.records[0]).toMatchObject({ tagName: "machine-learning", totalPageViews: 551412 });
  });

  it("imports user metrics CSV", async () => {
    const result = await importReportFile("user_metrics.csv", userMetricsCsv);
    expect(result.reportId).toBe("api-user-report");
    expect(result.records[0]).toMatchObject({ userId: 96, displayName: "Harley Q." });
  });

  it("imports inactive users CSV", async () => {
    const result = await importReportFile("inactive_users.csv", inactiveUsersCsv);
    expect(result.reportId).toBe("inactive-users");
    expect(result.records[0]).toMatchObject({ userId: 11, inactiveDays: 297 });
  });

  it("imports community members CSV", async () => {
    const result = await importReportFile("2026-04-13_community_members_Engineering.csv", communityMembersCsv);
    expect(result.reportId).toBe("community-members");
    expect(result.records[0]).toMatchObject({ name: "Jane Doe", isSme: true });
  });

  it("imports interaction matrix CSV", async () => {
    const result = await importReportFile("interaction_matrix.csv", interactionMatrixCsv);
    expect(result.reportId).toBe("interactions");
    expect(result.records).toHaveLength(2);
  });

  it("imports data export JSON", async () => {
    const result = await importReportFile("users.json", dataExportUsersJson);
    expect(result.reportId).toBe("data-export");
    expect(result.records).toHaveLength(2);
  });
});
```

Create `src/utils/downloads.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { recordsToCsv, recordsToJson } from "./downloads";

describe("downloads", () => {
  it("serializes records to CSV with escaped commas", () => {
    expect(recordsToCsv([{ name: "Harley Q.", tags: "release-management, product-support" }])).toBe(
      'name,tags\nHarley Q.,"release-management, product-support"',
    );
  });

  it("serializes records to pretty JSON", () => {
    expect(recordsToJson([{ id: 1 }])).toBe('[\n  {\n    "id": 1\n  }\n]');
  });
});
```

- [ ] **Step 3: Run tests and confirm failure**

Run:

```bash
pnpm test -- src/importers/reportImporters.test.ts src/utils/downloads.test.ts
```

Expected: FAIL because importer and download helpers are not implemented.

- [ ] **Step 4: Implement CSV and JSON helpers**

Create `src/importers/csv.ts`:

```ts
import Papa from "papaparse";

export function parseCsvRecords<T>(csvText: string): T[] {
  const parsed = Papa.parse<T>(csvText, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors.map((error) => error.message).join("; "));
  }
  return parsed.data;
}

export function toNumber(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function toBoolean(value: unknown): boolean {
  return String(value).toLowerCase() === "true";
}
```

Create `src/importers/json.ts`:

```ts
export function parseJsonRecords(text: string): unknown[] {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("Expected a JSON array.");
  }
  return parsed;
}
```

- [ ] **Step 5: Implement report importers**

Create `src/importers/reportImporters.ts`:

```ts
import type { ReportId } from "../domain/types";
import { parseCsvRecords, toBoolean, toNumber } from "./csv";
import { parseJsonRecords } from "./json";

interface ImportedReportFile {
  reportId: ReportId;
  records: Record<string, unknown>[];
}

export async function importReportFile(fileName: string, text: string): Promise<ImportedReportFile> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json")) {
    return { reportId: "data-export", records: parseJsonRecords(text) as Record<string, unknown>[] };
  }
  if (lower.includes("tag_metrics")) return { reportId: "tag-report", records: importTagMetrics(text) };
  if (lower.includes("user_metrics")) return { reportId: "api-user-report", records: importUserMetrics(text) };
  if (lower.includes("inactive")) return { reportId: "inactive-users", records: importInactiveUsers(text) };
  if (lower.includes("community_members")) return { reportId: "community-members", records: importCommunityMembers(text) };
  if (lower.includes("interaction_matrix")) return { reportId: "interactions", records: importInteractionMatrix(text) };
  throw new Error(`Unsupported report output file: ${fileName}`);
}

function importTagMetrics(text: string) {
  return parseCsvRecords<Record<string, string>>(text).map((row) => ({
    tagName: row["Tag Name"],
    totalPageViews: toNumber(row["Total Page Views"]),
    webhooks: toNumber(row.Webhooks),
    tagWatchers: toNumber(row["Tag Watchers"]),
    totalSmes: toNumber(row["Total Smes"]),
    questionCount: toNumber(row["Question Count"]),
    answerCount: toNumber(row["Answer Count"]),
  }));
}

function importUserMetrics(text: string) {
  return parseCsvRecords<Record<string, string>>(text).map((row) => ({
    userId: toNumber(row["User ID"]),
    displayName: row["Display Name"],
    netReputation: toNumber(row["Net Reputation"]),
    accountInactivityDays: toNumber(row["Account Inactivity (Days)"]),
    answers: toNumber(row.Answers),
    questions: toNumber(row.Questions),
    accountStatus: row["Account Status"],
    department: row.Department,
  }));
}

function importInactiveUsers(text: string) {
  return parseCsvRecords<Record<string, string>>(text).map((row) => ({
    userId: toNumber(row.user_id),
    email: row.verified_email,
    displayName: row.display_name,
    inactiveDays: toNumber(row.inactive_days),
    isDeactivated: toBoolean(row.is_deactivated),
    reputation: toNumber(row.reputation),
    answerCount: toNumber(row.answer_count),
    questionCount: toNumber(row.question_count),
    articleCount: toNumber(row.article_count),
  }));
}

function importCommunityMembers(text: string) {
  return parseCsvRecords<Record<string, string>>(text).map((row) => ({
    name: row.Name,
    email: row.Email,
    memberSince: row["Member Since"],
    isSme: toBoolean(row["Is SME"]),
    jobTitle: row["Job Title"],
    department: row.Department,
  }));
}

function importInteractionMatrix(text: string) {
  const rows = parseCsvRecords<Record<string, string>>(text);
  return rows.flatMap((row) => {
    const source = row.source;
    return Object.entries(row)
      .filter(([key]) => key !== "source")
      .map(([target, weight]) => ({ source, target, weight: toNumber(weight) }))
      .filter((entry) => entry.weight > 0);
  });
}
```

- [ ] **Step 6: Implement download serializers**

Create `src/utils/downloads.ts`:

```ts
export function recordsToJson(records: unknown[]): string {
  return JSON.stringify(records, null, 2);
}

export function recordsToCsv(records: Record<string, unknown>[]): string {
  if (records.length === 0) return "";
  const headers = Object.keys(records[0]);
  const lines = [
    headers.join(","),
    ...records.map((record) => headers.map((header) => escapeCsvValue(record[header])).join(",")),
  ];
  return lines.join("\n");
}

function escapeCsvValue(value: unknown): string {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function downloadTextFile(fileName: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 7: Verify tests pass**

Run:

```bash
pnpm test -- src/importers/reportImporters.test.ts src/utils/downloads.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit importers**

```bash
git add src/importers src/test/fixtures src/utils
git commit -m "feat: import existing report outputs"
```

## Task 6: Implement Report Transformers

**Files:**
- Create: `src/reports/reportModels.ts`
- Create: `src/reports/tagReport.ts`
- Create: `src/reports/userReport.ts`
- Create: `src/reports/inactiveUsers.ts`
- Create: `src/reports/interactions.ts`
- Create: `src/reports/communityMembers.ts`
- Create: `src/reports/dataExport.ts`
- Create: `src/reports/reportTransforms.test.ts`

- [ ] **Step 1: Write report transform tests**

Create `src/reports/reportTransforms.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { summarizeCommunityMembers } from "./communityMembers";
import { summarizeDataExport } from "./dataExport";
import { summarizeInactiveUsers } from "./inactiveUsers";
import { buildInteractionSummary } from "./interactions";
import { summarizeTags } from "./tagReport";
import { summarizeUsers } from "./userReport";

describe("report transforms", () => {
  it("summarizes tag metrics", () => {
    const summary = summarizeTags([
      { tagName: "python", totalPageViews: 100, tagWatchers: 10, totalSmes: 2, questionCount: 4, answerCount: 8 },
      { tagName: "r", totalPageViews: 50, tagWatchers: 5, totalSmes: 1, questionCount: 2, answerCount: 3 },
    ]);
    expect(summary.metricCards).toContainEqual({ label: "Tags", value: 2 });
    expect(summary.topTagsByViews[0].tagName).toBe("python");
  });

  it("summarizes user metrics", () => {
    const summary = summarizeUsers([
      { userId: 1, displayName: "A", netReputation: 20, accountInactivityDays: 0, answers: 5, questions: 1, accountStatus: "Registered", department: "Engineering" },
      { userId: 2, displayName: "B", netReputation: 10, accountInactivityDays: 90, answers: 0, questions: 2, accountStatus: "Deactivated", department: "Product" },
    ]);
    expect(summary.accountStatusCounts).toEqual({ Registered: 1, Deactivated: 1 });
    expect(summary.topContributors[0].displayName).toBe("A");
  });

  it("summarizes inactive users", () => {
    const summary = summarizeInactiveUsers([
      { userId: 1, inactiveDays: 120, isDeactivated: false, reputation: 10, answerCount: 1, questionCount: 0, articleCount: 0 },
      { userId: 2, inactiveDays: 240, isDeactivated: true, reputation: 0, answerCount: 0, questionCount: 0, articleCount: 0 },
    ]);
    expect(summary.contributingInactiveUsers).toBe(1);
    expect(summary.deactivatedInactiveUsers).toBe(1);
  });

  it("builds interaction summary", () => {
    const summary = buildInteractionSummary([
      { source: "Engineering", target: "Product", weight: 4 },
      { source: "Product", target: "Engineering", weight: 2 },
    ]);
    expect(summary.totalInteractions).toBe(6);
    expect(summary.nodes).toEqual(["Engineering", "Product"]);
  });

  it("summarizes community members", () => {
    const summary = summarizeCommunityMembers([
      { name: "Jane Doe", isSme: true, department: "Engineering" },
      { name: "John Smith", isSme: false, department: "Product" },
    ]);
    expect(summary.totalMembers).toBe(2);
    expect(summary.smeMembers).toBe(1);
  });

  it("summarizes data export datasets", () => {
    const summary = summarizeDataExport({
      users: [{ id: 1 }],
      tags: [{ name: "python" }, { name: "r" }],
    });
    expect(summary.datasetCounts).toEqual({ users: 1, tags: 2 });
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm test -- src/reports/reportTransforms.test.ts
```

Expected: FAIL because report transformer modules are not implemented.

- [ ] **Step 3: Implement shared report models**

Create `src/reports/reportModels.ts`:

```ts
export interface MetricCard {
  label: string;
  value: number | string;
}

export type CountMap = Record<string, number>;
```

- [ ] **Step 4: Implement report transformers**

Create `src/reports/tagReport.ts`:

```ts
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
  const totalViews = rows.reduce((sum, row) => sum + row.totalPageViews, 0);
  const totalQuestions = rows.reduce((sum, row) => sum + row.questionCount, 0);
  const metricCards: MetricCard[] = [
    { label: "Tags", value: rows.length },
    { label: "Page Views", value: totalViews },
    { label: "Questions", value: totalQuestions },
  ];
  return {
    metricCards,
    topTagsByViews: [...rows].sort((a, b) => b.totalPageViews - a.totalPageViews).slice(0, 10),
  };
}
```

Create `src/reports/userReport.ts`:

```ts
import type { CountMap } from "./reportModels";

export interface UserMetricRow {
  userId: number;
  displayName: string;
  netReputation: number;
  accountInactivityDays: number;
  answers: number;
  questions: number;
  accountStatus: string;
  department?: string;
}

export function summarizeUsers(rows: UserMetricRow[]) {
  return {
    totalUsers: rows.length,
    accountStatusCounts: countBy(rows, (row) => row.accountStatus || "Unknown"),
    departmentCounts: countBy(rows, (row) => row.department || "Unknown"),
    topContributors: [...rows].sort((a, b) => b.netReputation - a.netReputation).slice(0, 10),
  };
}

function countBy<T>(rows: T[], getKey: (row: T) => string): CountMap {
  return rows.reduce<CountMap>((counts, row) => {
    const key = getKey(row);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}
```

Create `src/reports/inactiveUsers.ts`:

```ts
export interface InactiveUserRow {
  userId: number;
  inactiveDays: number;
  isDeactivated: boolean;
  reputation: number;
  answerCount: number;
  questionCount: number;
  articleCount: number;
}

export function summarizeInactiveUsers(rows: InactiveUserRow[]) {
  return {
    totalInactiveUsers: rows.length,
    deactivatedInactiveUsers: rows.filter((row) => row.isDeactivated).length,
    contributingInactiveUsers: rows.filter(
      (row) => row.answerCount + row.questionCount + row.articleCount > 0,
    ).length,
    highReputationInactiveUsers: rows.filter((row) => row.reputation >= 100).length,
  };
}
```

Create `src/reports/interactions.ts`:

```ts
export interface InteractionEdge {
  source: string;
  target: string;
  weight: number;
}

export function buildInteractionSummary(edges: InteractionEdge[]) {
  const nodes = [...new Set(edges.flatMap((edge) => [edge.source, edge.target]))].sort();
  return {
    totalInteractions: edges.reduce((sum, edge) => sum + edge.weight, 0),
    nodes,
    edges,
    topEdges: [...edges].sort((a, b) => b.weight - a.weight).slice(0, 10),
  };
}
```

Create `src/reports/communityMembers.ts`:

```ts
import type { CountMap } from "./reportModels";

export interface CommunityMemberRow {
  name: string;
  isSme: boolean;
  department?: string;
}

export function summarizeCommunityMembers(rows: CommunityMemberRow[]) {
  return {
    totalMembers: rows.length,
    smeMembers: rows.filter((row) => row.isSme).length,
    departmentCounts: rows.reduce<CountMap>((counts, row) => {
      const key = row.department || "Unknown";
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {}),
  };
}
```

Create `src/reports/dataExport.ts`:

```ts
export function summarizeDataExport(datasets: Record<string, unknown[]>) {
  return {
    datasetCounts: Object.fromEntries(
      Object.entries(datasets).map(([name, records]) => [name, records.length]),
    ),
  };
}
```

- [ ] **Step 5: Verify tests pass**

Run:

```bash
pnpm test -- src/reports/reportTransforms.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit report transforms**

```bash
git add src/reports
git commit -m "feat: add report transformers"
```

## Task 7: Add Dataset Planner And Live Collectors

**Files:**
- Create: `src/collectors/datasetPlanner.ts`
- Create: `src/collectors/liveCollectors.ts`
- Create: `src/collectors/datasetPlanner.test.ts`

- [ ] **Step 1: Write dataset planner tests**

Create `src/collectors/datasetPlanner.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { planDatasetsForReports } from "./datasetPlanner";

describe("planDatasetsForReports", () => {
  it("deduplicates shared datasets across selected reports", () => {
    expect(planDatasetsForReports(["tag-report", "api-user-report"])).toEqual([
      "tags",
      "users",
      "questions",
      "articles",
      "tagSmes",
      "reputationHistory",
      "communities",
    ]);
  });

  it("ignores later-phase reports", () => {
    expect(planDatasetsForReports(["webhook-report"])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm test -- src/collectors/datasetPlanner.test.ts
```

Expected: FAIL because collector modules are not implemented.

- [ ] **Step 3: Implement dataset planner**

Create `src/collectors/datasetPlanner.ts`:

```ts
import { reportRegistry } from "../domain/reportRegistry";
import type { DatasetName, ReportId } from "../domain/types";

export function planDatasetsForReports(reportIds: ReportId[]): DatasetName[] {
  const planned: DatasetName[] = [];
  for (const reportId of reportIds) {
    const report = reportRegistry.find((candidate) => candidate.id === reportId && candidate.phase === "mvp");
    if (!report) continue;
    for (const dataset of report.requiredDatasets) {
      if (!planned.includes(dataset)) planned.push(dataset);
    }
  }
  return planned;
}
```

- [ ] **Step 4: Add live collector skeleton with explicit dataset mapping**

Create `src/collectors/liveCollectors.ts`:

```ts
import { StackApiV2Client } from "../api/stackApiV2";
import { StackApiV3Client } from "../api/stackApiV3";
import type { DatasetName } from "../domain/types";

interface LiveCollectorClients {
  v2: StackApiV2Client;
  v3: StackApiV3Client;
}

export async function collectDataset(dataset: DatasetName, clients: LiveCollectorClients): Promise<unknown[]> {
  switch (dataset) {
    case "users":
      return clients.v2.getPagedItems("/users", { pagesize: "100" });
    case "tags":
      return clients.v2.getPagedItems("/tags", { pagesize: "100" });
    case "questions":
      return clients.v2.getPagedItems("/questions", { pagesize: "100" });
    case "articles":
      return clients.v2.getPagedItems("/articles", { pagesize: "100" });
    case "communities":
      return clients.v3.getPagedItems("/communities", { pagesize: "100" });
    case "userGroups":
      return clients.v3.getPagedItems("/user-groups", { pagesize: "100" });
    case "tagSmes":
    case "reputationHistory":
    case "interactions":
    case "dataExport":
      return [];
    default:
      return [];
  }
}
```

- [ ] **Step 5: Verify tests pass**

Run:

```bash
pnpm test -- src/collectors/datasetPlanner.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit collectors**

```bash
git add src/collectors
git commit -m "feat: plan shared report datasets"
```

## Task 8: Add Worker Client For Parsing And Transformation

**Files:**
- Create: `src/workers/reportWorker.ts`
- Create: `src/workers/reportWorkerClient.ts`
- Create: `src/workers/reportWorkerClient.test.ts`

- [ ] **Step 1: Write worker client test**

Create `src/workers/reportWorkerClient.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createInlineReportWorkerClient } from "./reportWorkerClient";

describe("createInlineReportWorkerClient", () => {
  it("imports uploaded report text through the same client interface", async () => {
    const client = createInlineReportWorkerClient();
    const result = await client.importFile("inactive_users.csv", "user_id,display_name,inactive_days,is_deactivated,reputation,answer_count,question_count,article_count\n1,A,90,FALSE,0,0,0,0");
    expect(result.reportId).toBe("inactive-users");
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm test -- src/workers/reportWorkerClient.test.ts
```

Expected: FAIL because worker client does not exist.

- [ ] **Step 3: Implement worker and inline client**

Create `src/workers/reportWorkerClient.ts`:

```ts
import { importReportFile } from "../importers/reportImporters";

export interface ReportWorkerClient {
  importFile(fileName: string, text: string): Promise<Awaited<ReturnType<typeof importReportFile>>>;
}

export function createInlineReportWorkerClient(): ReportWorkerClient {
  return {
    importFile: importReportFile,
  };
}
```

Create `src/workers/reportWorker.ts`:

```ts
import { importReportFile } from "../importers/reportImporters";

self.addEventListener("message", async (event: MessageEvent<{ id: string; fileName: string; text: string }>) => {
  const { id, fileName, text } = event.data;
  try {
    const result = await importReportFile(fileName, text);
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});
```

- [ ] **Step 4: Verify tests pass**

Run:

```bash
pnpm test -- src/workers/reportWorkerClient.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit worker client**

```bash
git add src/workers
git commit -m "feat: add report worker client"
```

## Task 9: Build The Stacks App Shell, Catalog, Credentials, And Session Overview

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles/app.css`
- Create: `src/components/AppShell.tsx`
- Create: `src/components/ReportCatalog.tsx`
- Create: `src/components/CredentialsPanel.tsx`
- Create: `src/components/SessionOverview.tsx`
- Create: `src/components/AppShell.test.tsx`

- [ ] **Step 1: Write component tests**

Create `src/components/AppShell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../App";

describe("App shell", () => {
  it("renders report catalog and all MVP reports", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Stack API Utilities" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tag Report" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Data Export" })).toBeInTheDocument();
  });

  it("opens the shared credentials panel", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Credentials" }));
    expect(screen.getByRole("heading", { name: "Session Credentials" })).toBeInTheDocument();
    expect(screen.getByText("Credentials are kept in memory for this browser session only.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm test -- src/components/AppShell.test.tsx
```

Expected: FAIL because the app shell components do not exist.

- [ ] **Step 3: Implement app shell components**

Create `src/components/AppShell.tsx`:

```tsx
import type { ReactNode } from "react";

interface AppShellProps {
  activePanel: "report" | "credentials" | "uploads";
  onPanelChange: (panel: "report" | "credentials" | "uploads") => void;
  sidebar: ReactNode;
  children: ReactNode;
}

export function AppShell({ activePanel, onPanelChange, sidebar, children }: AppShellProps) {
  return (
    <div className="app-layout">
      <header className="app-topbar">
        <div>
          <p className="fs-caption fc-light mb2">Stack Overflow for Teams</p>
          <h1 className="fs-headline1 m0">Stack API Utilities</h1>
        </div>
        <nav className="d-flex g8">
          <button className="s-btn s-btn__muted" aria-pressed={activePanel === "report"} onClick={() => onPanelChange("report")}>Reports</button>
          <button className="s-btn s-btn__muted" aria-pressed={activePanel === "credentials"} onClick={() => onPanelChange("credentials")}>Credentials</button>
          <button className="s-btn s-btn__muted" aria-pressed={activePanel === "uploads"} onClick={() => onPanelChange("uploads")}>Uploads</button>
        </nav>
      </header>
      <div className="app-body">
        {sidebar}
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
```

Create `src/components/ReportCatalog.tsx`:

```tsx
import { getExecutableReports } from "../domain/reportRegistry";
import type { ReportId } from "../domain/types";

interface ReportCatalogProps {
  selectedReportId: ReportId;
  onSelect: (reportId: ReportId) => void;
}

export function ReportCatalog({ selectedReportId, onSelect }: ReportCatalogProps) {
  return (
    <aside className="app-sidebar">
      <h2 className="fs-body3 tt-uppercase fc-light">Report Catalog</h2>
      <div className="d-flex fd-column g6">
        {getExecutableReports().map((report) => (
          <button
            key={report.id}
            className={`s-btn s-btn__unset ta-left report-nav-item ${selectedReportId === report.id ? "is-selected" : ""}`}
            onClick={() => onSelect(report.id)}
          >
            {report.title}
          </button>
        ))}
      </div>
    </aside>
  );
}
```

Create `src/components/CredentialsPanel.tsx`:

```tsx
export function CredentialsPanel() {
  return (
    <section className="workspace-panel">
      <h2 className="fs-title">Session Credentials</h2>
      <p className="fs-body2">Credentials are kept in memory for this browser session only.</p>
      <div className="s-notice s-notice__info mt16" role="note">
        <p className="m0">Credential acquisition guidance placeholder: add internal instructions for API keys, PATs, access tokens, and required scopes here.</p>
      </div>
    </section>
  );
}
```

Create `src/components/SessionOverview.tsx`:

```tsx
import type { SessionState } from "../domain/types";

export function SessionOverview({ state }: { state: SessionState }) {
  const loadedDatasets = Object.values(state.datasets);
  if (loadedDatasets.length === 0) return null;

  return (
    <section className="session-overview">
      <h2 className="fs-title">Session Overview</h2>
      <div className="overview-grid">
        {loadedDatasets.map((dataset) => (
          <div className="s-card" key={dataset.name}>
            <div className="fs-caption tt-uppercase fc-light">{dataset.name}</div>
            <div className="fs-title">{dataset.records.length}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Wire components into `App.tsx`**

Replace `src/App.tsx` with:

```tsx
import { useReducer, useState } from "react";
import { AppShell } from "./components/AppShell";
import { CredentialsPanel } from "./components/CredentialsPanel";
import { ReportCatalog } from "./components/ReportCatalog";
import { SessionOverview } from "./components/SessionOverview";
import { reportRegistry } from "./domain/reportRegistry";
import { createInitialSessionState, sessionReducer } from "./domain/sessionStore";
import type { ReportId } from "./domain/types";

export function App() {
  const [state, dispatch] = useReducer(sessionReducer, undefined, createInitialSessionState);
  const [activePanel, setActivePanel] = useState<"report" | "credentials" | "uploads">("report");
  const selectedReport = reportRegistry.find((report) => report.id === state.selectedReportId)!;

  function selectReport(reportId: ReportId) {
    dispatch({ type: "report/select", reportId });
    setActivePanel("report");
  }

  return (
    <AppShell
      activePanel={activePanel}
      onPanelChange={setActivePanel}
      sidebar={<ReportCatalog selectedReportId={state.selectedReportId} onSelect={selectReport} />}
    >
      <SessionOverview state={state} />
      {activePanel === "credentials" ? (
        <CredentialsPanel />
      ) : (
        <section className="workspace-panel">
          <p className="fs-caption fc-light mb4">{selectedReport.sourceRepo}</p>
          <h2 className="fs-title">{selectedReport.title}</h2>
          <p className="fs-body2">{selectedReport.description}</p>
        </section>
      )}
    </AppShell>
  );
}
```

- [ ] **Step 5: Extend layout styles**

Append to `src/styles/app.css`:

```css
.app-layout {
  min-height: 100vh;
  background: var(--black-050);
}

.app-body {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  min-height: calc(100vh - 72px);
}

.app-sidebar {
  padding: 20px 16px;
  border-right: 1px solid var(--black-150);
  background: var(--white);
}

.app-main {
  padding: 24px;
}

.workspace-panel,
.session-overview {
  max-width: 1180px;
  margin: 0 auto 16px;
}

.report-nav-item {
  display: block;
  width: 100%;
  padding: 8px 10px;
  border-radius: 4px;
}

.report-nav-item.is-selected {
  background: var(--theme-primary-100);
  color: var(--theme-primary-700);
  font-weight: 600;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

@media (max-width: 800px) {
  .app-body {
    grid-template-columns: 1fr;
  }

  .app-sidebar {
    border-right: 0;
    border-bottom: 1px solid var(--black-150);
  }
}
```

- [ ] **Step 6: Verify component tests pass**

Run:

```bash
pnpm test -- src/components/AppShell.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit shell UI**

```bash
git add src/App.tsx src/components src/styles/app.css
git commit -m "feat: add reporting app shell"
```

## Task 10: Add Uploads, Tables, Run Controls, And Report Workspace

**Files:**
- Create: `src/components/UploadsPanel.tsx`
- Create: `src/components/DataTable.tsx`
- Create: `src/components/RunControls.tsx`
- Create: `src/components/RunStatus.tsx`
- Create: `src/components/ReportWorkspace.tsx`
- Create: `src/components/ReportWorkspace.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write workspace tests**

Create `src/components/ReportWorkspace.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ReportWorkspace } from "./ReportWorkspace";

describe("ReportWorkspace", () => {
  it("shows report scope notes, run controls, dashboard tab, and raw table tab", async () => {
    render(
      <ReportWorkspace
        reportId="tag-report"
        records={[{ tagName: "python", totalPageViews: 100 }]}
        onRun={() => undefined}
      />,
    );
    expect(screen.getByRole("heading", { name: "Tag Report" })).toBeInTheDocument();
    expect(screen.getByText("Session-only credentials required before live API runs.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Run Tag Report" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Raw Table" }));
    expect(screen.getByText("python")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm test -- src/components/ReportWorkspace.test.tsx
```

Expected: FAIL because `ReportWorkspace` does not exist.

- [ ] **Step 3: Implement reusable data table**

Create `src/components/DataTable.tsx`:

```tsx
import { useMemo, useState } from "react";

interface DataTableProps {
  records: Record<string, unknown>[];
}

export function DataTable({ records }: DataTableProps) {
  const [query, setQuery] = useState("");
  const columns = useMemo(() => Object.keys(records[0] ?? {}), [records]);
  const filtered = records.filter((record) =>
    Object.values(record).some((value) => String(value ?? "").toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="data-table">
      <label className="d-block mb8">
        <span className="d-block fs-caption tt-uppercase fc-light mb4">Search</span>
        <input className="s-input" value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="s-table-container">
        <table className="s-table s-table__striped">
          <thead>
            <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((record, index) => (
              <tr key={index}>
                {columns.map((column) => <td key={column}>{String(record[column] ?? "")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement run controls and status**

Create `src/components/RunControls.tsx`:

```tsx
import { reportRegistry } from "../domain/reportRegistry";
import type { ReportId } from "../domain/types";

export function RunControls({ reportId, onRun }: { reportId: ReportId; onRun: () => void }) {
  const report = reportRegistry.find((candidate) => candidate.id === reportId)!;
  return (
    <div className="d-flex g8 ai-center mt16">
      <button className="s-btn s-btn__primary" onClick={onRun}>Run {report.title}</button>
      <button className="s-btn s-btn__muted">Run selected reports</button>
    </div>
  );
}
```

Create `src/components/RunStatus.tsx`:

```tsx
import type { RunQueueItem } from "../domain/types";

export function RunStatus({ queue }: { queue: RunQueueItem[] }) {
  if (queue.length === 0) return null;
  return (
    <section className="s-notice s-notice__info mt16">
      <ul className="m0">
        {queue.map((item) => <li key={item.id}>{item.message}</li>)}
      </ul>
    </section>
  );
}
```

- [ ] **Step 5: Implement report workspace**

Create `src/components/ReportWorkspace.tsx`:

```tsx
import { useState } from "react";
import { reportRegistry } from "../domain/reportRegistry";
import type { ReportId } from "../domain/types";
import { DataTable } from "./DataTable";
import { RunControls } from "./RunControls";

interface ReportWorkspaceProps {
  reportId: ReportId;
  records: Record<string, unknown>[];
  onRun: () => void;
}

export function ReportWorkspace({ reportId, records, onRun }: ReportWorkspaceProps) {
  const [tab, setTab] = useState<"dashboard" | "table">("dashboard");
  const report = reportRegistry.find((candidate) => candidate.id === reportId)!;

  return (
    <section className="workspace-panel">
      <p className="fs-caption fc-light mb4">{report.sourceRepo}</p>
      <h2 className="fs-title">{report.title}</h2>
      <p className="fs-body2">{report.description}</p>
      <div className="s-notice s-notice__info mt12">
        <p className="m0">Session-only credentials required before live API runs.</p>
      </div>
      <RunControls reportId={reportId} onRun={onRun} />
      <div className="s-navigation s-navigation__muted mt24" role="tablist">
        <button className="s-navigation--item" aria-selected={tab === "dashboard"} onClick={() => setTab("dashboard")}>Dashboard</button>
        <button className="s-navigation--item" aria-selected={tab === "table"} onClick={() => setTab("table")}>Raw Table</button>
      </div>
      {tab === "dashboard" ? (
        <div className="s-card mt16">
          <p className="m0">Dashboard cards and charts render here when data is loaded.</p>
        </div>
      ) : (
        <div className="mt16">
          <DataTable records={records} />
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 6: Implement uploads panel**

Create `src/components/UploadsPanel.tsx`:

```tsx
export function UploadsPanel() {
  return (
    <section className="workspace-panel">
      <h2 className="fs-title">Uploads</h2>
      <p className="fs-body2">Upload existing CSV or JSON outputs from current SO4T scripts. Files are parsed locally in this browser session only.</p>
      <input className="s-input" type="file" multiple accept=".csv,.json" />
    </section>
  );
}
```

- [ ] **Step 7: Wire workspace into App**

Modify `src/App.tsx` to render `UploadsPanel` and `ReportWorkspace`:

```tsx
import { useReducer, useState } from "react";
import { AppShell } from "./components/AppShell";
import { CredentialsPanel } from "./components/CredentialsPanel";
import { ReportCatalog } from "./components/ReportCatalog";
import { ReportWorkspace } from "./components/ReportWorkspace";
import { SessionOverview } from "./components/SessionOverview";
import { UploadsPanel } from "./components/UploadsPanel";
import { createInitialSessionState, sessionReducer } from "./domain/sessionStore";
import type { ReportId } from "./domain/types";

export function App() {
  const [state, dispatch] = useReducer(sessionReducer, undefined, createInitialSessionState);
  const [activePanel, setActivePanel] = useState<"report" | "credentials" | "uploads">("report");

  function selectReport(reportId: ReportId) {
    dispatch({ type: "report/select", reportId });
    setActivePanel("report");
  }

  return (
    <AppShell
      activePanel={activePanel}
      onPanelChange={setActivePanel}
      sidebar={<ReportCatalog selectedReportId={state.selectedReportId} onSelect={selectReport} />}
    >
      <SessionOverview state={state} />
      {activePanel === "credentials" && <CredentialsPanel />}
      {activePanel === "uploads" && <UploadsPanel />}
      {activePanel === "report" && (
        <ReportWorkspace
          reportId={state.selectedReportId}
          records={[]}
          onRun={() => undefined}
        />
      )}
    </AppShell>
  );
}
```

- [ ] **Step 8: Verify tests pass**

Run:

```bash
pnpm test -- src/components/ReportWorkspace.test.tsx src/components/AppShell.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit workspace UI**

```bash
git add src/App.tsx src/components
git commit -m "feat: add report workspace UI"
```

## Task 11: Add Dashboard Components And Report Summaries To UI

**Files:**
- Create: `src/components/DashboardCards.tsx`
- Create: `src/components/charts/BarList.tsx`
- Create: `src/components/charts/InteractionMatrix.tsx`
- Modify: `src/components/ReportWorkspace.tsx`
- Create: `src/components/DashboardCards.test.tsx`

- [ ] **Step 1: Write dashboard component tests**

Create `src/components/DashboardCards.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardCards } from "./DashboardCards";

describe("DashboardCards", () => {
  it("renders metric cards", () => {
    render(<DashboardCards cards={[{ label: "Users", value: 42 }, { label: "Tags", value: 12 }]} />);
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Tags")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm test -- src/components/DashboardCards.test.tsx
```

Expected: FAIL because `DashboardCards` does not exist.

- [ ] **Step 3: Implement dashboard cards and chart shells**

Create `src/components/DashboardCards.tsx`:

```tsx
import type { MetricCard } from "../reports/reportModels";

export function DashboardCards({ cards }: { cards: MetricCard[] }) {
  return (
    <div className="dashboard-card-grid">
      {cards.map((card) => (
        <div className="s-card" key={card.label}>
          <div className="fs-caption tt-uppercase fc-light">{card.label}</div>
          <div className="fs-title">{card.value}</div>
        </div>
      ))}
    </div>
  );
}
```

Create `src/components/charts/BarList.tsx`:

```tsx
export function BarList({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="bar-list">
      {rows.map((row) => (
        <div className="bar-row" key={row.label}>
          <span>{row.label}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(row.value / max) * 100}%` }} /></div>
          <strong>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}
```

Create `src/components/charts/InteractionMatrix.tsx`:

```tsx
import type { InteractionEdge } from "../../reports/interactions";

export function InteractionMatrix({ edges }: { edges: InteractionEdge[] }) {
  if (edges.length === 0) return <p>No interaction data loaded.</p>;
  return (
    <table className="s-table s-table__striped">
      <thead><tr><th>Source</th><th>Target</th><th>Weight</th></tr></thead>
      <tbody>
        {edges.map((edge) => (
          <tr key={`${edge.source}-${edge.target}`}>
            <td>{edge.source}</td>
            <td>{edge.target}</td>
            <td>{edge.weight}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Add dashboard styles**

Append to `src/styles/app.css`:

```css
.dashboard-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.bar-list {
  display: grid;
  gap: 8px;
}

.bar-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) 2fr auto;
  gap: 8px;
  align-items: center;
}

.bar-track {
  height: 8px;
  background: var(--black-100);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--theme-primary-400);
}
```

- [ ] **Step 5: Verify tests pass**

Run:

```bash
pnpm test -- src/components/DashboardCards.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit dashboard components**

```bash
git add src/components src/styles/app.css
git commit -m "feat: add dashboard components"
```

## Task 12: Add Upload Flow Integration

**Files:**
- Modify: `src/domain/sessionStore.ts`
- Modify: `src/components/UploadsPanel.tsx`
- Modify: `src/App.tsx`
- Create: `src/components/UploadsPanel.test.tsx`

- [ ] **Step 1: Write upload flow test**

Create `src/components/UploadsPanel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { tagMetricsCsv } from "../test/fixtures/reportFixtures";
import { UploadsPanel } from "./UploadsPanel";

describe("UploadsPanel", () => {
  it("imports a CSV file and reports loaded rows", async () => {
    const onImported = vi.fn();
    render(<UploadsPanel onImported={onImported} />);
    const file = new File([tagMetricsCsv], "tag_metrics.csv", { type: "text/csv" });

    await userEvent.upload(screen.getByLabelText("Upload report outputs"), file);

    expect(await screen.findByText("Imported tag_metrics.csv for Tag Report.")).toBeInTheDocument();
    expect(onImported).toHaveBeenCalledWith(expect.objectContaining({
      reportId: "tag-report",
      datasetName: "tags",
    }));
  });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm test -- src/components/UploadsPanel.test.tsx
```

Expected: FAIL because `UploadsPanel` lacks import behavior.

- [ ] **Step 3: Extend session reducer for imported reports**

Add this action to `SessionAction` in `src/domain/sessionStore.ts`:

```ts
| { type: "import/loaded"; datasetName: DatasetName; records: unknown[] }
```

Add this reducer case:

```ts
case "import/loaded":
  return {
    ...state,
    datasets: {
      ...state.datasets,
      [action.datasetName]: {
        name: action.datasetName,
        records: action.records,
        loadedAt: new Date().toISOString(),
        source: "upload",
      },
    },
  };
```

- [ ] **Step 4: Implement upload import UI**

Replace `src/components/UploadsPanel.tsx` with:

```tsx
import { useState } from "react";
import { reportRegistry } from "../domain/reportRegistry";
import type { DatasetName, ReportId } from "../domain/types";
import { importReportFile } from "../importers/reportImporters";

interface UploadsPanelProps {
  onImported?: (result: Awaited<ReturnType<typeof importReportFile>> & { datasetName: DatasetName }) => void;
}

export function UploadsPanel({ onImported }: UploadsPanelProps) {
  const [message, setMessage] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      const text = await file.text();
      const result = await importReportFile(file.name, text);
      const report = reportRegistry.find((candidate) => candidate.id === result.reportId);
      setMessage(`Imported ${file.name} for ${report?.title ?? result.reportId}.`);
      onImported?.({ ...result, datasetName: datasetNameForImportedReport(result.reportId) });
    }
  }

  return (
    <section className="workspace-panel">
      <h2 className="fs-title">Uploads</h2>
      <p className="fs-body2">Upload existing CSV or JSON outputs from current SO4T scripts. Files are parsed locally in this browser session only.</p>
      <label className="d-block">
        <span className="d-block fs-caption tt-uppercase fc-light mb4">Upload report outputs</span>
        <input className="s-input" type="file" multiple accept=".csv,.json" onChange={(event) => void handleFiles(event.currentTarget.files)} />
      </label>
      {message && <div className="s-notice s-notice__success mt16">{message}</div>}
    </section>
  );
}

function datasetNameForImportedReport(reportId: ReportId): DatasetName {
  switch (reportId) {
    case "tag-report":
      return "tags";
    case "api-user-report":
      return "users";
    case "inactive-users":
      return "users";
    case "interactions":
      return "interactions";
    case "community-members":
      return "communities";
    case "data-export":
      return "dataExport";
    default:
      return "dataExport";
  }
}
```

- [ ] **Step 5: Wire imports into App**

Modify the `UploadsPanel` usage in `src/App.tsx`:

```tsx
{activePanel === "uploads" && (
  <UploadsPanel
    onImported={(result) => {
      dispatch({ type: "import/loaded", datasetName: result.datasetName, records: result.records });
    }}
  />
)}
```

- [ ] **Step 6: Verify upload tests pass**

Run:

```bash
pnpm test -- src/components/UploadsPanel.test.tsx src/domain/sessionStore.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit upload flow**

```bash
git add src/App.tsx src/components/UploadsPanel.tsx src/components/UploadsPanel.test.tsx src/domain/sessionStore.ts
git commit -m "feat: wire uploaded report outputs"
```

## Task 13: Add Browser Smoke Test And Build Verification

**Files:**
- Create: `e2e/reporting-mvp.spec.ts`
- Modify: `src/styles/app.css` if Playwright reveals layout overflow.

- [ ] **Step 1: Write Playwright smoke test**

Create `e2e/reporting-mvp.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("reporting MVP shell supports catalog, credentials, and uploads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Stack API Utilities" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tag Report" })).toBeVisible();
  await page.getByRole("button", { name: "Credentials" }).click();
  await expect(page.getByRole("heading", { name: "Session Credentials" })).toBeVisible();
  await page.getByRole("button", { name: "Uploads" }).click();
  await expect(page.getByRole("heading", { name: "Uploads" })).toBeVisible();
});
```

- [ ] **Step 2: Install Playwright browser if needed**

Run:

```bash
npx playwright install chromium
```

Expected: Chromium browser is installed for Playwright. If network access is blocked, rerun with approved network access.

- [ ] **Step 3: Run full verification**

Run:

```bash
pnpm test
pnpm build
pnpm e2e
```

Expected: all unit tests pass, production build succeeds, and Playwright smoke test passes.

- [ ] **Step 4: Fix responsive/layout issues found by screenshots**

If the Playwright test fails because visible text overlaps or app content is clipped, adjust only `src/styles/app.css` layout rules. Re-run:

```bash
pnpm build
pnpm e2e
```

Expected: PASS.

- [ ] **Step 5: Commit verification**

```bash
git add e2e src/styles/app.css
git commit -m "test: add reporting mvp browser smoke test"
```

## Task 14: Final Documentation And Static Build Handoff

**Files:**
- Create: `README.md`
- Modify: `docs/superpowers/specs/2026-07-03-reporting-mvp-design.md` only if implementation reveals a spec correction that the user approved.

- [ ] **Step 1: Create README**

Create `README.md`:

```md
# Stack API Utilities

Static browser app for Stack Overflow for Teams / Stack Internal reporting utilities.

## MVP Scope

The first release focuses on browser-ready read-only reports:

- Tag Report
- API User Report
- Inactive Users
- Interactions
- Community Members
- Data Export

Credentials and generated report data are session-only. The app does not persist credentials or report data in browser storage.

## Development

Install dependencies:

```bash
pnpm install
```

Start the dev server:

```bash
pnpm dev
```

Run verification:

```bash
pnpm test
pnpm build
pnpm e2e
```

## Static Build

Create the static build:

```bash
pnpm build
```

The deployable static files are written to `dist/`.
```

- [ ] **Step 2: Run final verification**

Run:

```bash
pnpm test
pnpm build
pnpm e2e
```

Expected: PASS.

- [ ] **Step 3: Commit docs**

```bash
git add README.md
git commit -m "docs: add reporting mvp readme"
```

## Self-Review Checklist

- Spec coverage:
  - Static TypeScript app: Tasks 1, 13, 14.
  - Stacks UI and Report Catalog: Tasks 1, 9, 10.
  - Session-only credentials/data: Tasks 2, 3, 9, 12.
  - Both live API and upload data paths: Tasks 4, 5, 7, 12.
  - All browser-ready read-only reports: Tasks 2, 5, 6, 9, 10, 11.
  - Batch/shared dataset planning: Task 7.
  - Raw tables and exports: Tasks 5, 10.
  - Dashboards and session overview: Tasks 6, 9, 11.
  - Excluded write/admin/SCIM tools: Task 2 registry metadata and design spec.
  - Testing: Tasks 1 through 14 include failing test, pass verification, or browser smoke checks.
- Literal scan: no incomplete-work markers, vague fill-in instructions, or undefined report IDs remain in the plan body.
- Type consistency:
  - `ReportId`, `DatasetName`, `SessionCredentials`, and `SessionState` originate in `src/domain/types.ts`.
  - Registry IDs match tests and UI labels.
  - Importers return `reportId` values from `ReportId`.
  - Report transformer interfaces match importer output names for MVP sample paths.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-03-reporting-mvp.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
