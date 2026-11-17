import { describe, expect, it } from "vitest";
import { GET as handleHealthzGet, dynamic } from "../app/api/healthz/route";

describe("GET /api/healthz", () => {
  it("reports the process as healthy without caching", async () => {
    const response = await handleHealthzGet();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("is never statically prerendered", () => {
    expect(dynamic).toBe("force-dynamic");
  });
});
