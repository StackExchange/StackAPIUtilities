import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserGroupSyncPanel } from "./UserGroupSyncPanel";

afterEach(() => {
  vi.restoreAllMocks();
});

const credentials = {
  instanceType: "enterprise" as const,
  baseUrl: "https://demo.stackenterprise.co",
  accessToken: "token",
};

const csv = [
  "Director,Senior Manager,User Group Member,First Name,Last Name,Colleague ID,Email,Job Title",
  "Pat Director,Ada Lovelace,Grace Hopper,Grace,Hopper,1001,grace@example.com,Engineer",
].join("\n");

describe("UserGroupSyncPanel", () => {
  it("uploads a CSV and previews add-only changes", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          result: {
            syncMode: "add-only",
            groupNameTemplate: "{Senior Manager} VRM",
            blockingErrors: [],
            skippedRows: [],
            groups: [
              {
                manager: "Ada Lovelace",
                groupName: "Ada Lovelace VRM",
                existingGroupId: null,
                createGroup: true,
                desiredUserIds: [1],
                addUserIds: [1],
                removeUserIds: [],
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    render(<UserGroupSyncPanel credentials={credentials} />);

    await user.upload(
      screen.getByLabelText("Upload user export CSV"),
      new File([csv], "users.csv", { type: "text/csv" }),
    );
    await user.click(screen.getByRole("button", { name: "Preview changes" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/write-tools/user-group-sync",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          action: "preview",
          credentials,
          csvText: csv,
          groupNameTemplate: "{Senior Manager} VRM",
          syncMode: "add-only",
        }),
      }),
    );
    expect(await screen.findByText("Ada Lovelace VRM")).toBeInTheDocument();
    expect(screen.getByText("Add-only")).toBeInTheDocument();
    expect(screen.queryByText("Members to remove")).not.toBeInTheDocument();
  });

  it("shows exact-sync removals and asks for browser confirmation before apply", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: {
              syncMode: "exact-sync",
              groupNameTemplate: "{Senior Manager} VRM",
              blockingErrors: [],
              skippedRows: [],
              groups: [
                {
                  manager: "Ada Lovelace",
                  groupName: "Ada Lovelace VRM",
                  existingGroupId: 10,
                  createGroup: false,
                  desiredUserIds: [1],
                  addUserIds: [],
                  removeUserIds: [99],
                },
              ],
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: {
              preview: {
                groups: [],
                skippedRows: [],
                blockingErrors: [],
                syncMode: "exact-sync",
                groupNameTemplate: "{Senior Manager} VRM",
              },
              operations: [
                {
                  kind: "remove-member",
                  groupName: "Ada Lovelace VRM",
                  userIds: [99],
                  status: "succeeded",
                },
              ],
            },
          }),
          { status: 200 },
        ),
      );

    render(<UserGroupSyncPanel credentials={credentials} />);

    await user.upload(
      screen.getByLabelText("Upload user export CSV"),
      new File([csv], "users.csv", { type: "text/csv" }),
    );
    await user.click(screen.getByLabelText("Exact sync"));
    await user.click(screen.getByRole("button", { name: "Preview changes" }));
    expect(await screen.findByText("Members to remove")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Apply changes" }));

    expect(window.confirm).toHaveBeenCalledWith(
      "Exact sync can remove users from generated VRM groups. Apply these changes?",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual(
      expect.objectContaining({
        action: "apply",
        syncMode: "exact-sync",
      }),
    );
    expect(await screen.findByText("remove-member succeeded for Ada Lovelace VRM: 99")).toBeInTheDocument();
  });

  it("disables apply when preview has blocking errors", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          result: {
            syncMode: "add-only",
            groupNameTemplate: "VRM",
            blockingErrors: [
              'Group name "VRM" is produced by multiple Senior Manager values: Ada Lovelace, Alan Turing.',
            ],
            skippedRows: [],
            groups: [],
          },
        }),
        { status: 200 },
      ),
    );

    render(<UserGroupSyncPanel credentials={credentials} />);

    await user.upload(
      screen.getByLabelText("Upload user export CSV"),
      new File([csv], "users.csv", { type: "text/csv" }),
    );
    await user.clear(screen.getByLabelText("Group name template"));
    await user.type(screen.getByLabelText("Group name template"), "VRM");
    await user.click(screen.getByRole("button", { name: "Preview changes" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/multiple Senior Manager values/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply changes" })).toBeDisabled();
  });

  it("warns when credentials are missing and reports an error if preview is requested", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch");

    render(<UserGroupSyncPanel credentials={null} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Save Enterprise session credentials before using write tools.",
    );

    await user.upload(
      screen.getByLabelText("Upload user export CSV"),
      new File([csv], "users.csv", { type: "text/csv" }),
    );
    await user.click(screen.getByRole("button", { name: "Preview changes" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Save Enterprise session credentials before using write tools.",
    );
  });
});
