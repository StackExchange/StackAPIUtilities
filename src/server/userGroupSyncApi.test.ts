import { describe, expect, it, vi } from "vitest";
import type { SessionCredentials } from "../domain/types";
import type { UserGroupSyncClient } from "../writeTools/userGroupSyncRunner";
import { handleUserGroupSyncRequest } from "./userGroupSyncApi";

const credentials: SessionCredentials = {
  instanceType: "enterprise",
  baseUrl: "https://demo.stackenterprise.co",
  accessToken: "token",
};

const csvText = [
  "Director,Senior Manager,User Group Member,First Name,Last Name,Colleague ID,Email,Job Title",
  "Pat Director,Ada Lovelace,Grace Hopper,Grace,Hopper,1001,grace@example.com,Engineer",
].join("\n");

describe("handleUserGroupSyncRequest", () => {
  it("returns preview results", async () => {
    const client = createClient({
      getUserByEmail: vi.fn().mockResolvedValue({ id: 1, email: "grace@example.com", name: "Grace Hopper" }),
      getUserGroups: vi.fn().mockResolvedValue([]),
    });

    const response = await handleUserGroupSyncRequest(
      {
        action: "preview",
        credentials,
        csvText,
        groupNameTemplate: "{Senior Manager} VRM",
        syncMode: "add-only",
      },
      { createClient: () => client },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      result: expect.objectContaining({
        groups: [
          expect.objectContaining({
            groupName: "Ada Lovelace VRM",
            createGroup: true,
          }),
        ],
      }),
    });
  });

  it("rejects non-enterprise credentials", async () => {
    const response = await handleUserGroupSyncRequest({
      action: "preview",
      credentials: { ...credentials, instanceType: "basic-business" },
      csvText,
      groupNameTemplate: "{Senior Manager} VRM",
      syncMode: "add-only",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Enterprise user group sync requires Enterprise session credentials.",
    });
  });

  it("rejects enterprise credentials with a Basic/Business URL", async () => {
    const createClient = vi.fn();

    const response = await handleUserGroupSyncRequest(
      {
        action: "preview",
        credentials: {
          ...credentials,
          baseUrl: "https://stackoverflowteams.com/c/team",
        },
        csvText,
        groupNameTemplate: "{Senior Manager} VRM",
        syncMode: "add-only",
      },
      { createClient },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Enterprise user group sync requires Enterprise session credentials.",
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns a 400 response for malformed instance URLs", async () => {
    const createClient = vi.fn();

    const response = await handleUserGroupSyncRequest(
      {
        action: "preview",
        credentials: {
          ...credentials,
          baseUrl: "not a url",
        },
        csvText,
        groupNameTemplate: "{Senior Manager} VRM",
        syncMode: "add-only",
      },
      { createClient },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Enterprise user group sync requires a valid instance URL.",
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("applies changes through the runner", async () => {
    const client = createClient({
      getUserByEmail: vi.fn().mockResolvedValue({ id: 1, email: "grace@example.com", name: "Grace Hopper" }),
      getUserGroups: vi.fn().mockResolvedValue([]),
      createUserGroup: vi.fn().mockResolvedValue({ id: 10, name: "Ada Lovelace VRM", users: [{ id: 1 }] }),
    });

    const response = await handleUserGroupSyncRequest(
      {
        action: "apply",
        credentials,
        csvText,
        groupNameTemplate: "{Senior Manager} VRM",
        syncMode: "add-only",
      },
      { createClient: () => client },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      result: expect.objectContaining({
        operations: [
          expect.objectContaining({
            kind: "create-group",
            groupName: "Ada Lovelace VRM",
            userIds: [1],
            status: "succeeded",
          }),
        ],
      }),
    });
    expect(client.createUserGroup).toHaveBeenCalledWith({ name: "Ada Lovelace VRM", userIds: [1] });
  });

  it("returns a 400 response for invalid request payloads", async () => {
    const response = await handleUserGroupSyncRequest({ action: "preview" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "User group sync request is invalid.",
    });
  });

  it("requires an Enterprise access token or PAT", async () => {
    const response = await handleUserGroupSyncRequest({
      action: "preview",
      credentials: { instanceType: "enterprise", baseUrl: "https://demo.stackenterprise.co" },
      csvText,
      groupNameTemplate: "{Senior Manager} VRM",
      syncMode: "add-only",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Enterprise user group sync requires an access token with write_access.",
    });
  });

  it("returns runner errors as 500 responses", async () => {
    const client = createClient({
      getUserByEmail: vi.fn().mockRejectedValue(new Error("Stack lookup failed")),
      getUserGroups: vi.fn().mockResolvedValue([]),
    });

    const response = await handleUserGroupSyncRequest(
      {
        action: "preview",
        credentials,
        csvText,
        groupNameTemplate: "{Senior Manager} VRM",
        syncMode: "add-only",
      },
      { createClient: () => client },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Stack lookup failed",
    });
  });
});

function createClient(overrides: Partial<UserGroupSyncClient> = {}): UserGroupSyncClient {
  return {
    getUserByEmail: vi.fn(),
    getUserGroups: vi.fn(),
    createUserGroup: vi.fn(),
    addUserGroupMembers: vi.fn(),
    removeUserGroupMember: vi.fn(),
    ...overrides,
  };
}
