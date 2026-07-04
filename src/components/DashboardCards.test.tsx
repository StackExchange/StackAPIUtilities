import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardCards } from "./DashboardCards";
import { BarList } from "./charts/BarList";
import { InteractionMatrix } from "./charts/InteractionMatrix";

describe("DashboardCards", () => {
  it("renders metric cards with formatted values", () => {
    render(
      <DashboardCards
        cards={[
          { label: "Users", value: 42 },
          { label: "Page Views", value: 551412 },
        ]}
      />,
    );

    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Page Views")).toBeInTheDocument();
    expect(screen.getByText("551,412")).toBeInTheDocument();
  });

  it("renders a quiet empty state when no metrics are loaded", () => {
    render(<DashboardCards cards={[]} />);

    expect(screen.getByText("No dashboard data loaded yet.")).toBeInTheDocument();
  });
});

describe("BarList", () => {
  it("renders ranked rows with proportional bars", () => {
    render(
      <BarList
        rows={[
          { label: "python", value: 100 },
          { label: "java", value: 25 },
        ]}
      />,
    );

    expect(screen.getByText("python")).toBeInTheDocument();
    expect(screen.getByText("java")).toBeInTheDocument();
    expect(screen.getByLabelText("python: 100")).toHaveStyle({ width: "100%" });
    expect(screen.getByLabelText("java: 25")).toHaveStyle({ width: "25%" });
  });

  it("renders a useful empty state", () => {
    render(<BarList rows={[]} emptyMessage="No tag activity loaded." />);

    expect(screen.getByText("No tag activity loaded.")).toBeInTheDocument();
  });
});

describe("InteractionMatrix", () => {
  it("renders interaction edges in a compact table", () => {
    render(
      <InteractionMatrix
        edges={[
          { source: "Engineering", target: "Product", weight: 4 },
          { source: "Product", target: "Engineering", weight: 2 },
        ]}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Source" })).toBeInTheDocument();
    expect(screen.getAllByText("Engineering")).toHaveLength(2);
    expect(screen.getAllByText("Product")).toHaveLength(2);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders an empty interaction state", () => {
    render(<InteractionMatrix edges={[]} />);

    expect(screen.getByText("No interaction data loaded.")).toBeInTheDocument();
  });
});
