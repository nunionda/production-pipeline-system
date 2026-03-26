import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    // Setup: log in and save auth state
    {
      name: "setup",
      testMatch: "**/auth.setup.ts",
    },
    // Actual E2E tests (depend on auth setup)
    {
      name: "e2e",
      use: {
        ...devices["Desktop Chrome"],
        // Use saved auth state for authenticated tests
        storageState: "e2e/.auth/ad-user.json",
      },
      dependencies: ["setup"],
    },
  ],
});
