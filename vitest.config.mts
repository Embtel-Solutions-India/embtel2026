import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/helpers/server-only.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
    globalSetup: ["tests/helpers/global-setup.ts"],
    testTimeout: 30_000, // bcrypt cost 12 + in-memory mongo are slow when every file runs in parallel
    hookTimeout: 300_000, // first run may download mongod
  },
});
