import { defineConfig } from "@playwright/test";
import { E2E_PORT } from "./tests/e2e/creds";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: `http://localhost:${E2E_PORT}` },
  webServer: {
    // Memory Mongo + seeded admin + production build; see tests/e2e/server.ts.
    command: "npx tsx tests/e2e/server.ts",
    url: `http://localhost:${E2E_PORT}/`,
    reuseExistingServer: false,
    timeout: 600_000,
    stdout: "pipe",
  },
});
