import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the native/Node packages out of the server bundle so their raw source
  // is loaded via require(). axe-core must stay untransformed - the bundler
  // otherwise rewrites its UMD wrapper and injection into the page fails.
  serverExternalPackages: ["playwright", "playwright-core", "@axe-core/playwright", "axe-core"],
  // The workspace has a package-lock.json above the repo; pin the root explicitly.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
