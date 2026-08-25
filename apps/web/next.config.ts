import type { NextConfig } from "next";

const devSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  allowedDevOrigins:
    process.env.NODE_ENV === "development" && devSupabaseUrl
      ? [new URL(devSupabaseUrl).hostname]
      : undefined,
  // Workspace packages ship raw TypeScript; Next transpiles them.
  transpilePackages: ["@reforma/core", "@reforma/db"],
  experimental: {
    serverActions: {
      bodySizeLimit: "55mb",
    },
  },
};

export default nextConfig;
