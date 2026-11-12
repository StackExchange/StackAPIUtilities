import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liveness/readiness probe for container hosting. It only proves the Node
// process is serving requests; it deliberately calls no upstream Stack API.
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
