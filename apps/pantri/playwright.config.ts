import { defineConfig, devices } from "@playwright/test";

/**
 * Serves `public/` only — enough to verify the offline shell assets without
 * needing Cloudflare remote bindings for `react-router dev`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:4174",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "pnpm exec serve public -l 4174",
    url: "http://127.0.0.1:4174/site.webmanifest",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
