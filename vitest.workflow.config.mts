import { fileURLToPath } from "node:url";
import { workflow } from "@workflow/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [workflow()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.integration.test.ts"],
    testTimeout: 60_000,
  },
});
