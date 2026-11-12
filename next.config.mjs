/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server (.next/standalone) so the container image
  // ships only the traced runtime files instead of the full node_modules tree.
  output: "standalone",
};

export default nextConfig;
