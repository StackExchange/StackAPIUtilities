import { defineConfig, devices } from "@playwright/test";

const host = "127.0.0.1";
const port = process.env.PORT ?? "5180";
const baseURL = `http://${host}:${port}`;

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `./node_modules/.bin/next dev -H ${host} -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
