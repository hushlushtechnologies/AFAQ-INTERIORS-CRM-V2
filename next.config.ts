import path from "node:path";
import type { NextConfig } from "next";

// This app lives inside the old CRM folder. Pin the root to this folder so
// Next/Turbopack doesn't pick up the parent project's files (e.g. its src/proxy.ts).
const root = path.resolve(__dirname);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: { root },
  outputFileTracingRoot: root,
};

export default nextConfig;
