import { defineConfig, devices } from "@playwright/test";

const WEB_URL = process.env.E2E_WEB_URL ?? "http://localhost:8080";
const API_URL = process.env.E2E_API_URL ?? "http://localhost:3001";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    extraHTTPHeaders: { "X-E2E-Source": "playwright" },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // We intentionally do NOT use `webServer` — the suite runs against the
  // live `docker compose up` stack so it exercises the real production
  // build path (nginx + bundled VITE_API_URL) instead of `vite dev`.
  metadata: { webUrl: WEB_URL, apiUrl: API_URL },
});
