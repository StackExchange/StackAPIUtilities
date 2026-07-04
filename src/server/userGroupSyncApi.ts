import { StackApiV3Client } from "../api/stackApiV3";
import { normalizeInstanceUrl } from "../credentials/credentialRules";
import type { SessionCredentials } from "../domain/types";
import {
  applyUserGroupSync,
  previewUserGroupSync,
  type UserGroupSyncApplyResult,
  type UserGroupSyncClient,
} from "../writeTools/userGroupSyncRunner";
import type { UserGroupSyncMode, UserGroupSyncPlan } from "../writeTools/userGroupSync";

export interface UserGroupSyncRequestPayload {
  action: "preview" | "apply";
  credentials: SessionCredentials;
  csvText: string;
  groupNameTemplate: string;
  syncMode: UserGroupSyncMode;
}

interface UserGroupSyncApiDependencies {
  createClient?: (credentials: SessionCredentials) => UserGroupSyncClient;
}

export type UserGroupSyncResponseBody =
  | { ok: true; result: UserGroupSyncPlan | UserGroupSyncApplyResult }
  | { ok: false; error: string };

export async function handleUserGroupSyncRequest(
  payload: unknown,
  dependencies: UserGroupSyncApiDependencies = {},
): Promise<Response> {
  if (!isUserGroupSyncRequestPayload(payload)) {
    return jsonResponse({ ok: false, error: "User group sync request is invalid." }, 400);
  }

  if (payload.credentials.instanceType !== "enterprise") {
    return jsonResponse(
      { ok: false, error: "Enterprise user group sync requires Enterprise session credentials." },
      400,
    );
  }

  if (!payload.credentials.accessToken && !payload.credentials.pat) {
    return jsonResponse(
      { ok: false, error: "Enterprise user group sync requires an access token with write_access." },
      400,
    );
  }

  try {
    const client = (dependencies.createClient ?? createStackApiV3Client)(payload.credentials);
    const runnerInput = {
      csvText: payload.csvText,
      groupNameTemplate: payload.groupNameTemplate,
      syncMode: payload.syncMode,
      client,
    };
    const result =
      payload.action === "preview"
        ? await previewUserGroupSync(runnerInput)
        : await applyUserGroupSync(runnerInput);

    return jsonResponse({ ok: true, result }, 200);
  } catch (error) {
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
}

function createStackApiV3Client(credentials: SessionCredentials): StackApiV3Client {
  const normalizedInstance = normalizeInstanceUrl(credentials.baseUrl);

  return new StackApiV3Client({
    apiV3Url: normalizedInstance.apiV3Url,
    token: credentials.accessToken ?? credentials.pat ?? "",
  });
}

function isUserGroupSyncRequestPayload(value: unknown): value is UserGroupSyncRequestPayload {
  if (
    !isRecord(value) ||
    (value.action !== "preview" && value.action !== "apply") ||
    typeof value.csvText !== "string" ||
    typeof value.groupNameTemplate !== "string" ||
    !isUserGroupSyncMode(value.syncMode) ||
    !isRecord(value.credentials)
  ) {
    return false;
  }

  return (
    typeof value.credentials.instanceType === "string" &&
    typeof value.credentials.baseUrl === "string" &&
    (value.credentials.accessToken === undefined || typeof value.credentials.accessToken === "string") &&
    (value.credentials.pat === undefined || typeof value.credentials.pat === "string")
  );
}

function isUserGroupSyncMode(value: unknown): value is UserGroupSyncMode {
  return value === "add-only" || value === "exact-sync";
}

function jsonResponse(body: UserGroupSyncResponseBody, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
