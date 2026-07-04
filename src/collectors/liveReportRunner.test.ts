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
});
