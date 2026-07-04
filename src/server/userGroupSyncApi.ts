import { StackApiV3Client } from "../api/stackApiV3";
import { normalizeInstanceUrl, type NormalizedInstance } from "../credentials/credentialRules";
import type { SessionCredentials } from "../domain/types";
import {
  applyUserGroupSync,
  previewUserGroupSync,
  UserGroupSyncInputError,
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

  const normalizedCredentials = normalizeWriteCredentials(payload.credentials);
  const normalizedInstance = normalizeRequestInstance(normalizedCredentials.baseUrl);
  if (normalizedInstance === null) {
    return jsonResponse(
      { ok: false, error: "Enterprise user group sync requires a valid instance URL." },
      400,
    );
  }

  if (
    normalizedCredentials.instanceType !== "enterprise" ||
    normalizedInstance.instanceType !== "enterprise"
  ) {
    return jsonResponse(
      { ok: false, error: "Enterprise user group sync requires Enterprise session credentials." },
      400,
    );
  }

  if (!isSupportedEnterpriseWriteTarget(normalizedInstance)) {
    return jsonResponse(
      { ok: false, error: "Enterprise user group sync requires a Stack Enterprise instance URL." },
      400,
    );
  }

  if (!normalizedCredentials.accessToken && !normalizedCredentials.pat) {
    return jsonResponse(
      { ok: false, error: "Enterprise user group sync requires an access token with write_access." },
      400,
    );
  }

  try {
    const client = dependencies.createClient
      ? dependencies.createClient(normalizedCredentials)
      : createStackApiV3Client(normalizedCredentials, normalizedInstance);
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
    const errorMessage = toErrorMessage(error);
    return jsonResponse(
      { ok: false, error: errorMessage },
      error instanceof UserGroupSyncInputError ? 400 : 500,
    );
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeWriteCredentials(credentials: SessionCredentials): SessionCredentials {
  const normalizedCredentials: SessionCredentials = { ...credentials };
  const accessToken = normalizeOptionalToken(credentials.accessToken);
  const pat = normalizeOptionalToken(credentials.pat);

  if (accessToken) {
    normalizedCredentials.accessToken = accessToken;
  } else {
    delete normalizedCredentials.accessToken;
  }

  if (pat) {
    normalizedCredentials.pat = pat;
  } else {
    delete normalizedCredentials.pat;
  }

  return normalizedCredentials;
}

function normalizeOptionalToken(token: string | undefined): string | undefined {
  const trimmedToken = token?.trim();
  return trimmedToken ? trimmedToken : undefined;
}

function createStackApiV3Client(
  credentials: SessionCredentials,
  normalizedInstance: NormalizedInstance,
): StackApiV3Client {
  return new StackApiV3Client({
    apiV3Url: normalizedInstance.apiV3Url,
    token: credentials.accessToken ?? credentials.pat ?? "",
  });
}

function normalizeRequestInstance(baseUrl: string): NormalizedInstance | null {
  try {
    return normalizeInstanceUrl(baseUrl);
  } catch {
    return null;
  }
}

function isSupportedEnterpriseWriteTarget(normalizedInstance: NormalizedInstance): boolean {
  const url = new URL(normalizedInstance.baseUrl);
  const hostname = url.hostname.toLowerCase();

  return (
    url.protocol === "https:" &&
    (hostname === "stackenterprise.co" || hostname.endsWith(".stackenterprise.co"))
  );
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
