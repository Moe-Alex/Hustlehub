// Playwright settings. The tests run against a stack that is already up (docker compose up -d --build).
//   E2E_BASE_URL       where the web app is served          (default https://localhost:8443)
//   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD   the seeded admin   (needed for the admin test)
//   CHROMIUM_PATH      use an already-installed Chromium instead of the one Playwright downloads (optional)

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1, // the tests share one database and one rate-limit allowance
  forbidOnly: Boolean(process.env.CI),
  retries: 0, // a flaky test should be fixed, not retried
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://localhost:8443',
    ignoreHTTPSErrors: true, // the containers use a self-signed certificate
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
