import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["officeparser", "unpdf"],
  turbopack: { root: process.cwd() },
};

export default withWorkflow(nextConfig);
