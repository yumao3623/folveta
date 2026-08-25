import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["officeparser", "unpdf"],
  turbopack: { root: process.cwd() },
};

export default nextConfig;
