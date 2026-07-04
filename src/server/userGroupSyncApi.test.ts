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

const addOnlyExpectedPreview = {
  syncMode: "add-only" as const,
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
};

describe("handleUserGroupSyncRequest", () => {
  it("returns preview results", async () => {
    const client = createClient({
      getUserByEmail: vi.fn().mockResolvedValue({ id: 1, email: "grace@example.com", name: "Grace Hopper" }),
      getUserGroups: vi.fn().mockResolvedValue([]),
    });
    const createClientDependency = vi.fn((_credentials: SessionCredentials) => client);

    const response = await handleUserGroupSyncRequest(
      {
        action: "preview",
        credentials,
        csvText,
        groupNameTemplate: "{Senior Manager} VRM",
        syncMode: "add-only",
      },
      { createClient: createClientDependency },
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
    expect(createClientDependency).toHaveBeenCalledWith(credentials);
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

  it("rejects arbitrary public hosts as Enterprise write targets", async () => {
    const createClient = vi.fn();

    const response = await handleUserGroupSyncRequest(
      {
        action: "preview",
        credentials: {
          ...credentials,
          baseUrl: "https://example.com",
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
      error: "Enterprise user group sync requires a Stack Enterprise instance URL.",
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects local HTTP targets as Enterprise write targets", async () => {
    const createClient = vi.fn();

    const response = await handleUserGroupSyncRequest(
      {
        action: "preview",
        credentials: {
          ...credentials,
          baseUrl: "http://127.0.0.1:3000",
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
      error: "Enterprise user group sync requires a Stack Enterprise instance URL.",
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("accepts Stack Enterprise instance URLs", async () => {
    const client = createClient({
      getUserByEmail: vi.fn().mockResolvedValue({ id: 1, email: "grace@example.com", name: "Grace Hopper" }),
      getUserGroups: vi.fn().mockResolvedValue([]),
    });
    const createClientDependency = vi.fn((_credentials: SessionCredentials) => client);
    const stackEnterpriseCredentials: SessionCredentials = {
      ...credentials,
      baseUrl: "https://stackenterprise.co",
    };

    const response = await handleUserGroupSyncRequest(
      {
        action: "preview",
        credentials: stackEnterpriseCredentials,
        csvText,
        groupNameTemplate: "{Senior Manager} VRM",
        syncMode: "add-only",
      },
      { createClient: createClientDependency },
    );

    expect(response.status).toBe(200);
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
    expect(createClientDependency).toHaveBeenCalledWith(stackEnterpriseCredentials);
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
        expectedPreview: addOnlyExpectedPreview,
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

  it("rejects apply requests without an expected preview before writes", async () => {
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

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Preview changes before applying user group sync changes.",
    });
    expect(client.createUserGroup).not.toHaveBeenCalled();
    expect(client.addUserGroupMembers).not.toHaveBeenCalled();
    expect(client.removeUserGroupMember).not.toHaveBeenCalled();
  });

  it("rejects stale exact-sync previews before newly detected removals are applied", async () => {
    const client = createClient({
      getUserByEmail: vi.fn().mockResolvedValue({ id: 1, email: "grace@example.com", name: "Grace Hopper" }),
      getUserGroups: vi.fn().mockResolvedValue([
        {
          id: 10,
          name: "Ada Lovelace VRM",
          users: [
            { id: 1, name: "Grace Hopper" },
            { id: 99, name: "Newly Added Member" },
          ],
        },
      ]),
    });
    const expectedPreview = {
      syncMode: "exact-sync" as const,
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
          removeUserIds: [],
        },
      ],
    };

    const response = await handleUserGroupSyncRequest(
      {
        action: "apply",
        credentials,
        csvText,
        groupNameTemplate: "{Senior Manager} VRM",
        syncMode: "exact-sync",
        expectedPreview,
      },
      { createClient: () => client },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "User group sync preview is stale. Preview changes again before applying.",
    });
    expect(client.createUserGroup).not.toHaveBeenCalled();
    expect(client.addUserGroupMembers).not.toHaveBeenCalled();
    expect(client.removeUserGroupMember).not.toHaveBeenCalled();
  });

  it("returns a 400 response for invalid request payloads", async () => {
    const response = await handleUserGroupSyncRequest({ action: "preview" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "User group sync request is invalid.",
    });
  });

  it("returns a 400 response for invalid user export CSV", async () => {
    const client = createClient({
      getUserByEmail: vi.fn(),
      getUserGroups: vi.fn().mockResolvedValue([]),
    });
    const createClientDependency = vi.fn((_credentials: SessionCredentials) => client);

    const response = await handleUserGroupSyncRequest(
      {
        action: "preview",
        credentials,
        csvText: "Senior Manager,Email\nAda Lovelace,ada@example.com",
        groupNameTemplate: "{Senior Manager} VRM",
        syncMode: "add-only",
      },
      { createClient: createClientDependency },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error:
        "User export CSV is missing required column(s): Director, User Group Member, First Name, Last Name, Colleague ID, Job Title",
    });
  });

  it("returns a 400 response for malformed quoted CSV", async () => {
    const client = createClient({
      getUserByEmail: vi.fn(),
      getUserGroups: vi.fn().mockResolvedValue([]),
    });
    const createClientDependency = vi.fn((_credentials: SessionCredentials) => client);
    const malformedCsvText = [
      "Director,Senior Manager,User Group Member,First Name,Last Name,Colleague ID,Email,Job Title",
      'Pat Director,Ada Lovelace,"Grace" Hopper,Grace,Hopper,1001,grace@example.com,Engineer',
    ].join("\n");

    const response = await handleUserGroupSyncRequest(
      {
        action: "preview",
        credentials,
        csvText: malformedCsvText,
        groupNameTemplate: "{Senior Manager} VRM",
        syncMode: "add-only",
      },
      { createClient: createClientDependency },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error:
        "Trailing quote on quoted field is malformed; Quoted field unterminated; Too few fields: expected 8 fields but parsed 3",
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

  it("treats whitespace-only access tokens as missing", async () => {
    const createClient = vi.fn();

    const response = await handleUserGroupSyncRequest(
      {
        action: "preview",
        credentials: { ...credentials, accessToken: "   " },
        csvText,
        groupNameTemplate: "{Senior Manager} VRM",
        syncMode: "add-only",
      },
      { createClient },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Enterprise user group sync requires an access token with write_access.",
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("falls back to a PAT when access token is blank", async () => {
    const client = createClient({
      getUserByEmail: vi.fn().mockResolvedValue({ id: 1, email: "grace@example.com", name: "Grace Hopper" }),
      getUserGroups: vi.fn().mockResolvedValue([]),
    });
    const createClientDependency = vi.fn((_credentials: SessionCredentials) => client);
    const requestCredentials: SessionCredentials = {
      ...credentials,
      accessToken: "",
      pat: "pat-token",
    };

    const response = await handleUserGroupSyncRequest(
      {
        action: "preview",
        credentials: requestCredentials,
        csvText,
        groupNameTemplate: "{Senior Manager} VRM",
        syncMode: "add-only",
      },
      { createClient: createClientDependency },
    );

    expect(response.status).toBe(200);
    const [normalizedCredentials] = createClientDependency.mock.calls[0];
    expect(normalizedCredentials).toEqual(expect.objectContaining({ pat: "pat-token" }));
    expect(normalizedCredentials.accessToken).toBeUndefined();
  });

  it("trims access tokens before creating the client", async () => {
    const client = createClient({
      getUserByEmail: vi.fn().mockResolvedValue({ id: 1, email: "grace@example.com", name: "Grace Hopper" }),
      getUserGroups: vi.fn().mockResolvedValue([]),
    });
    const createClientDependency = vi.fn((_credentials: SessionCredentials) => client);
    const requestCredentials: SessionCredentials = {
      ...credentials,
      accessToken: "  token  ",
    };

    const response = await handleUserGroupSyncRequest(
      {
        action: "preview",
        credentials: requestCredentials,
        csvText,
        groupNameTemplate: "{Senior Manager} VRM",
        syncMode: "add-only",
      },
      { createClient: createClientDependency },
    );

    expect(response.status).toBe(200);
    expect(createClientDependency).toHaveBeenCalledWith({
      ...requestCredentials,
      accessToken: "token",
    });
  });

  it("returns client failures that look like parser errors as 500 responses", async () => {
    const parserLikeError =
      "User export CSV is missing required column(s): Director, User Group Member";
    const client = createClient({
      getUserByEmail: vi.fn().mockRejectedValue(new Error(parserLikeError)),
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
      error: parserLikeError,
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
