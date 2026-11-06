import { defineConfig } from '@playwright/test';

const deployedUrl = process.env.P5_TEST_URL;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  use: {
    baseURL: deployedUrl ?? 'http://127.0.0.1:4175/',
    viewport: { width: 1440, height: 1000 },
    channel: process.env.P5_CHROME_CHANNEL || undefined,
  },
  webServer: deployedUrl ? undefined : {
    command: 'npm run dev -- --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: true,
  },
});
