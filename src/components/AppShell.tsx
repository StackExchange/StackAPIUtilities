import type { ReactNode } from "react";

export type AppPanel = "report" | "credentials" | "uploads";

interface AppShellProps {
  activePanel: AppPanel;
  onPanelChange: (panel: AppPanel) => void;
  sidebar: ReactNode;
  children: ReactNode;
}

const panelLabels: Record<AppPanel, string> = {
  report: "Reports",
  credentials: "Credentials",
  uploads: "Uploads",
};

export function AppShell({ activePanel, onPanelChange, sidebar, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-title">
          <p className="fs-caption fc-light mb2">Stack Overflow for Teams</p>
          <h1 className="fs-headline1 m0">Stack API Utilities</h1>
        </div>
        <nav className="app-nav" aria-label="Application panels">
          {(Object.keys(panelLabels) as AppPanel[]).map((panel) => (
            <button
              className={`s-btn s-btn__muted app-nav-button${activePanel === panel ? " is-selected" : ""}`}
              type="button"
              aria-pressed={activePanel === panel}
              onClick={() => onPanelChange(panel)}
              key={panel}
            >
              {panelLabels[panel]}
            </button>
          ))}
        </nav>
      </header>
      <div className="app-body">
        <aside className="app-sidebar">{sidebar}</aside>
        <main className="app-main" aria-label="Workspace">
          {children}
        </main>
      </div>
    </div>
  );
}
