import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The workspace has a package-lock.json above the repo; pin the root explicitly.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
