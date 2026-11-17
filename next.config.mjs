/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server (.next/standalone) so the container image
  // ships only the traced runtime files instead of the full node_modules tree.
  output: "standalone",
  experimental: {
    // Loads src/instrumentation.ts at server start to install the outbound
    // request guard (src/server/egressGuard.ts). Stable from Next 15.
    instrumentationHook: true,
    // Load undici from node_modules instead of bundling it, so the guard sets
    // the same global dispatcher that Node's built-in fetch reads.
    serverComponentsExternalPackages: ["undici"],
  },
};

export default nextConfig;
