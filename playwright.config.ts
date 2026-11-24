import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:4321',
    channel: isCI ? undefined : 'chrome',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  webServer: isCI
    ? {
        command: 'npx astro preview --port 4321',
        url: 'http://localhost:4321',
        reuseExistingServer: true,
        timeout: 60000,
      }
    : undefined,
  projects: [
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: isCI ? undefined : 'chrome',
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        channel: isCI ? undefined : 'chrome',
      },
    },
  ],
});
