import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so the build ignores stray lockfiles in parent
  // directories (this repo lives under an unrelated parent folder).
  turbopack: {
    root: process.cwd(),
  },
  reactStrictMode: true,
};

export default nextConfig;
