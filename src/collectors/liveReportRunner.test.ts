import { describe, expect, it, vi } from "vitest";
import type { SessionCredentials } from "../domain/types";
import { UnsupportedLiveReportRunError, runLiveReport } from "./liveReportRunner";

const basicCredentials: SessionCredentials = {
  instanceType: "basic-business",
  baseUrl: "https://stackoverflowteams.com/c/example-team",
  accessToken: "token",
};

describe("runLiveReport", () => {
  it("collects mapped live datasets for a selected report", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [{ user_id: 1, display_name: "Ada" }], has_more: false }), {
        status: 200,
      }),
    );

    const result = await runLiveReport("inactive-users", basicCredentials, {
      fetchFn: fetchMock,
    });

    expect(result.datasets).toEqual([
      {
        datasetName: "users",
        records: [{ user_id: 1, display_name: "Ada" }],
      },
    ]);
    expect(result.messages).toEqual(["Collected users (1 record) for Inactive Users."]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0].toString()).toContain(
      "https://api.stackoverflowteams.com/2.3/users",
    );
    expect(fetchMock.mock.calls[0][0].toString()).toContain("team=example-team");
  });

  it("stops before fetching when a report needs unsupported live datasets", async () => {
    const fetchMock = vi.fn();

    await expect(
      runLiveReport("tag-report", basicCredentials, { fetchFn: fetchMock }),
    ).rejects.toMatchObject({
      unsupportedDatasets: ["tagSmes"],
    });
    await expect(
      runLiveReport("tag-report", basicCredentials, { fetchFn: fetchMock }),
    ).rejects.toThrow(UnsupportedLiveReportRunError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("runs Data Export by collecting concrete API datasets", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ items: [{ id: 1 }], has_more: false, totalPages: 1 }), {
          status: 200,
        }),
      ),
    );

    const result = await runLiveReport("data-export", basicCredentials, {
      fetchFn: fetchMock,
    });

    expect(result.datasets.map((dataset) => dataset.datasetName)).toEqual([
      "users",
      "userGroups",
      "tags",
      "articles",
      "questions",
      "answers",
      "comments",
    ]);
    expect(result.messages).toContain("Collected comments (1 record) for Data Export.");
  });

  it("builds Interactions from live content datasets", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = input.toString();
      const items = itemsForInteractionsUrl(url);

      return Promise.resolve(
        new Response(JSON.stringify({ items, has_more: false }), {
          status: 200,
        }),
      );
    });

    const result = await runLiveReport("interactions", basicCredentials, {
      fetchFn: fetchMock,
    });

    expect(result.datasets.map((dataset) => dataset.datasetName)).toEqual([
      "users",
      "questions",
      "answers",
      "comments",
      "interactions",
    ]);
    expect(result.datasets.find((dataset) => dataset.datasetName === "interactions")?.records).toEqual([
      { source: "Engineering", target: "Product", weight: 1 },
      { source: "Support", target: "Engineering", weight: 1 },
    ]);
  });
});

function itemsForInteractionsUrl(url: string): Record<string, unknown>[] {
  if (url.includes("/users")) {
    return [
      { user_id: 1, department: "Engineering" },
      { user_id: 2, department: "Product" },
      { user_id: 3, department: "Support" },
    ];
  }

  if (url.includes("/questions")) {
    return [{ question_id: 10, owner: { user_id: 2 } }];
  }

  if (url.includes("/answers")) {
    return [{ answer_id: 100, question_id: 10, owner: { user_id: 1 } }];
  }

  if (url.includes("/comments")) {
    return [{ comment_id: 200, post_id: 100, owner: { user_id: 3 } }];
  }

  return [];
}
