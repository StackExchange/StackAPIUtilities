export type FetchLike = typeof fetch;

export interface ThrottleNotice {
  kind: "backoff" | "burst" | "token-bucket";
  seconds: number;
  remaining?: number;
}

export class StackApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
    public readonly responseText: string,
  ) {
    super(message);
  }
}

export async function readJsonResponse<T>(response: Response, apiName: string): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new StackApiError(`${apiName} request failed with ${response.status}`, response.status, response.url, text);
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    const parseError = new Error(`${apiName} returned invalid JSON from ${response.url || "unknown URL"}.`);
    (parseError as Error & { cause?: unknown }).cause = error;
    throw parseError;
  }
}
