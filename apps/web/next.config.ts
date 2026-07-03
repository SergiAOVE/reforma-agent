import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship raw TypeScript; Next transpiles them.
  transpilePackages: ["@reforma/core", "@reforma/db"],
};

export default nextConfig;
