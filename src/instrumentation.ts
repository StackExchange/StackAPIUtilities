// Runs once when the Next.js server starts (not in the browser).
// Keep the Node-only import inside this exact NEXT_RUNTIME check: Next replaces
// it with a constant, so the edge-runtime build drops the branch entirely.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installEgressGuard } = await import("./server/egressGuard");
    if (installEgressGuard()) {
      console.info("[egress-guard] outbound requests are restricted to public internet addresses");
    } else {
      console.warn(
        "[egress-guard] disabled by STACK_API_UTILITIES_ALLOW_PRIVATE_EGRESS=true; do not use this on a publicly reachable deployment",
      );
    }
  }
}
