# Reporting Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the browser-only reporting MVP into a hybrid Stack Overflow product workspace with clearer navigation, credentials, uploads, and dashboard hierarchy.

**Architecture:** Keep the existing React state, report registry, importers, and dashboard data flow unchanged. Update shell/workspace/component markup only where it improves accessible hierarchy, then centralize the visual redesign in `src/styles/app.css` using Stacks plus app-specific brand tokens.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, React Testing Library, Playwright, `@stackoverflow/stacks`, pnpm.

---

## File Structure

- Modify `src/App.tsx`: compute session summary from existing state and pass it into the app shell.
- Modify `src/components/AppShell.tsx`: add summary pills, brand mark, product descriptor, and clearer top navigation markup.
- Modify `src/components/ReportCatalog.tsx`: add readiness/source metadata around each report button.
- Modify `src/components/ReportWorkspace.tsx`: improve selected report header, readiness strip, and tab container classes.
- Modify `src/components/CredentialsPanel.tsx`: improve session-only framing and scope-note hierarchy without changing saved credential behavior.
- Modify `src/components/UploadsPanel.tsx`: improve upload-area structure while preserving the `Upload report outputs` accessible label.
- Modify `src/components/RunControls.tsx`: keep one primary run action and one disabled batch action, with clearer class hooks.
- Modify `src/components/SessionOverview.tsx`: turn loaded datasets into compact session chips.
- Modify `src/styles/app.css`: implement brand tokens, layout, responsive behavior, focus states, dashboard/chart/table styling.
- Modify tests only where accessible text or classes intentionally change.

## Task 1: Shell Session Summary And Brand Frame

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/AppShell.tsx`
- Test: `src/components/AppShell.test.tsx`

- [ ] **Step 1: Update the shell test expectations**

Add checks that the shell still exposes the app heading and now exposes session status pills.

```tsx
expect(screen.getByRole("heading", { name: "Stack API Utilities" })).toBeInTheDocument();
expect(screen.getByText("No credentials")).toBeInTheDocument();
expect(screen.getByText("0 datasets")).toBeInTheDocument();
```

- [ ] **Step 2: Run the shell test to verify it fails**

Run: `pnpm test src/components/AppShell.test.tsx`

Expected: FAIL because the new status text is not rendered yet.

- [ ] **Step 3: Add an app shell summary prop**

In `src/components/AppShell.tsx`, add:

```tsx
interface AppShellSummary {
  credentialsSaved: boolean;
  datasetCount: number;
}

interface AppShellProps {
  activePanel: AppPanel;
  onPanelChange: (panel: AppPanel) => void;
  sidebar: ReactNode;
  children: ReactNode;
  summary?: AppShellSummary;
}
```

Update the component signature:

```tsx
export function AppShell({ activePanel, onPanelChange, sidebar, children, summary }: AppShellProps) {
  const credentialsLabel = summary?.credentialsSaved ? "Credentials saved" : "No credentials";
  const datasetLabel = `${summary?.datasetCount ?? 0} ${
    summary?.datasetCount === 1 ? "dataset" : "datasets"
  }`;
```

- [ ] **Step 4: Replace topbar markup**

Use this structure inside `AppShell`:

```tsx
<header className="app-topbar">
  <div className="app-brand-block">
    <div className="app-brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
    <div className="app-title">
      <p className="app-kicker">SO4T reports</p>
      <h1 className="app-heading">Stack API Utilities</h1>
    </div>
  </div>
  <nav className="app-nav" aria-label="Application panels">
    {(Object.keys(panelLabels) as AppPanel[]).map((panel) => (
      <button
        className={`app-nav-button${activePanel === panel ? " is-selected" : ""}`}
        type="button"
        aria-pressed={activePanel === panel}
        onClick={() => onPanelChange(panel)}
        key={panel}
      >
        {panelLabels[panel]}
      </button>
    ))}
  </nav>
  <div className="app-session-pills" aria-label="Session status">
    <span className="session-pill">{credentialsLabel}</span>
    <span className="session-pill">{datasetLabel}</span>
  </div>
</header>
```

- [ ] **Step 5: Pass summary from App**

In `src/App.tsx`, add:

```tsx
const datasetCount = Object.values(state.datasets).filter((dataset) => dataset !== undefined).length;
```

Then pass:

```tsx
summary={{ credentialsSaved: state.credentials !== null, datasetCount }}
```

- [ ] **Step 6: Run the shell test**

Run: `pnpm test src/components/AppShell.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/App.tsx src/components/AppShell.tsx src/components/AppShell.test.tsx
git commit -m "feat: add branded reporting shell"
```

## Task 2: Report Workspace And Workflow Copy

**Files:**
- Modify: `src/components/ReportCatalog.tsx`
- Modify: `src/components/ReportWorkspace.tsx`
- Modify: `src/components/RunControls.tsx`
- Modify: `src/components/ReportWorkspace.test.tsx`
- Modify: `src/components/RunControls.test.tsx`

- [ ] **Step 1: Update report workspace test copy**

Replace the old credential notice expectation with:

```tsx
expect(
  screen.getByText("Ready for session credentials. Uploads work now; live API runs come next."),
).toBeInTheDocument();
```

- [ ] **Step 2: Update run controls test for stable class hooks**

Check the primary action class:

```tsx
expect(screen.getByRole("button", { name: "Run Tag Report" })).toHaveClass(
  "report-run-primary",
);
```

- [ ] **Step 3: Run focused tests to verify they fail**

Run: `pnpm test src/components/ReportWorkspace.test.tsx src/components/RunControls.test.tsx`

Expected: FAIL because the new copy and class hook do not exist yet.

- [ ] **Step 4: Add report metadata to catalog buttons**

Inside each report button in `src/components/ReportCatalog.tsx`, render:

```tsx
<span className="report-list-title">{report.title}</span>
<span className="report-list-source">{report.sourceRepo}</span>
<span className="report-list-meta">Browser-ready read-only report</span>
```

- [ ] **Step 5: Update selected report header**

In `src/components/ReportWorkspace.tsx`, replace the header and notice area with:

```tsx
<div className="workspace-header">
  <div>
    <p className="workspace-kicker">{report.sourceRepo}</p>
    <h2 className="workspace-heading" id="selected-report-heading">
      {report.title}
    </h2>
  </div>
  <div className="workspace-stack-mark" aria-hidden="true">
    <span />
    <span />
    <span />
  </div>
</div>
<p className="workspace-copy">{report.description}</p>
<div className="workspace-readiness" role="note">
  <span className="readiness-dot" aria-hidden="true" />
  <p className="m0">Ready for session credentials. Uploads work now; live API runs come next.</p>
</div>
```

- [ ] **Step 6: Add run control class hooks**

In `src/components/RunControls.tsx`, update button classes:

```tsx
<button className="s-btn s-btn__filled report-run-primary" type="button" onClick={onRun}>
  Run {report.title}
</button>
<button
  className="s-btn s-btn__outlined s-btn__muted report-run-secondary"
  type="button"
  disabled
  title="Batch report runs arrive after report selection controls."
>
  Run selected reports
</button>
```

- [ ] **Step 7: Run focused tests**

Run: `pnpm test src/components/ReportWorkspace.test.tsx src/components/RunControls.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/components/ReportCatalog.tsx src/components/ReportWorkspace.tsx src/components/RunControls.tsx src/components/ReportWorkspace.test.tsx src/components/RunControls.test.tsx
git commit -m "feat: clarify report workspace flow"
```

## Task 3: Credentials, Uploads, And Session Overview Presentation

**Files:**
- Modify: `src/components/CredentialsPanel.tsx`
- Modify: `src/components/UploadsPanel.tsx`
- Modify: `src/components/SessionOverview.tsx`
- Test: existing component/app tests

- [ ] **Step 1: Preserve existing test expectations**

Run: `pnpm test src/components/AppShell.test.tsx src/components/UploadsPanel.test.tsx`

Expected before implementation: PASS.

- [ ] **Step 2: Improve credentials panel structure**

Keep the same fields and labels. Wrap the session-only copy in a classed note:

```tsx
<p className="workspace-copy credential-session-copy">
  Credentials are kept in memory for this browser session only.
</p>
```

Change the notes wrapper to:

```tsx
<div className="credential-notes" role="note">
  <p className="scope-label">Scope notes for selected report</p>
  <h3 className="fs-body2 mb8">{report.title} credential notes</h3>
  ...
</div>
```

- [ ] **Step 3: Improve uploads panel structure**

Wrap the input label in an upload drop-area class while preserving the label text:

```tsx
<label className="upload-dropzone">
  <span className="upload-dropzone-title">Upload report outputs</span>
  <span className="upload-dropzone-copy">CSV or JSON files from existing SO4T scripts</span>
  <input
    className="s-input"
    type="file"
    multiple
    accept=".csv,.json"
    onChange={(event) => void handleFiles(event.currentTarget.files)}
  />
</label>
```

- [ ] **Step 4: Make session overview compact**

Change the heading text to "Session Data" and dataset cards to use the existing `dataset-card` class with compact copy. Keep dataset names and counts unchanged.

- [ ] **Step 5: Run focused tests**

Run: `pnpm test src/components/AppShell.test.tsx src/components/UploadsPanel.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/components/CredentialsPanel.tsx src/components/UploadsPanel.tsx src/components/SessionOverview.tsx
git commit -m "feat: polish reporting workflow panels"
```

## Task 4: Brand Styling And Responsive QA

**Files:**
- Modify: `src/styles/app.css`
- Test: `src/components/AppShell.test.tsx`, `src/components/ReportWorkspace.test.tsx`, full suite, browser QA

- [ ] **Step 1: Add brand tokens and replace shell styles**

In `src/styles/app.css`, add app tokens under `:root` and restyle shell classes:

```css
:root {
  color-scheme: light;
  --so-brand-orange: #ff5e00;
  --so-brand-black: #201c1d;
  --so-brand-off-white: #f0efee;
  --so-brand-blue: #5074ef;
  --so-brand-green: #86af25;
  --so-brand-yellow: #ffcc00;
  --so-brand-purple: #9d9cff;
  --so-surface: #ffffff;
  --so-border: var(--black-150);
}
```

Replace existing layout styles with a denser off-white workspace, off-black topbar, orange active states, visible focus states, compact report rail, improved workspace panels, upload dropzone, metric cards, chart bars, tables, and mobile grid collapse.

- [ ] **Step 2: Run component tests**

Run: `pnpm test src/components/AppShell.test.tsx src/components/ReportWorkspace.test.tsx`

Expected: PASS.

- [ ] **Step 3: Run full verification**

Run:

```bash
pnpm test
pnpm build
pnpm e2e
```

Expected: all commands PASS.

- [ ] **Step 4: Open the app in the in-app browser**

Run the dev server if needed:

```bash
pnpm dev
```

Open `http://127.0.0.1:5173/` in the in-app browser. Verify the app loads, the topbar is off-black/orange, report catalog is visible, run controls are clear, credentials and uploads panels are reachable, and text does not overlap.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/styles/app.css
git commit -m "style: redesign reporting workspace"
```

## Self-Review

- Spec coverage: the plan covers the shell, report catalog, workspace, credentials, uploads, dashboards, accessibility, responsive layout, testing, and no live API behavior.
- Placeholder scan: the plan contains no implementation placeholders. The only placeholder behavior remains the user-requested credential guidance placeholder in the product copy.
- Type consistency: `AppShellSummary`, `summary`, `credentialsSaved`, and `datasetCount` are introduced in Task 1 and used consistently.
