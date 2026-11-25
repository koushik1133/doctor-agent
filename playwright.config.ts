import { defineConfig, devices } from "@playwright/test";
import os from "node:os";
import path from "node:path";

// End-to-end tests run against a production build (`next start`), so the real
// security headers and CSP are in force. They hit the live NPPES / CMS / NLM
// APIs, so they run in the nightly CI job rather than on every push.
const PORT = 3200;
const DATA_FILE = path.join(os.tmpdir(), `doctor-agent-e2e-${Date.now()}.json`);

export default defineConfig({
  testDir: "e2e",
  timeout: 180_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATA_FILE, NODE_ENV: "production", ADMIN_TOKEN: "e2e-admin" },
  },
});
