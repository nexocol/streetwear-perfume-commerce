import { defineConfig } from '@playwright/test'

// V4.9 auth tests need the real Worker (sessions live in D1), so they have their own config: `npm run build` then
//   npx playwright test -c playwright.v49.config.ts
export default defineConfig({
  testDir: './tests',
  testMatch: /v49\.spec\.ts$/,
  timeout: 60_000,
  workers: 1,
  fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:8799', browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/v49-test-server.mjs',
    url: 'http://127.0.0.1:8799/api/health',
    reuseExistingServer: false,
    timeout: 180_000,
    env: { V49_CLIENT_TEMP: 'qa-temp-Clave-0001', V49_DEMO_PASSWORD: 'demo-test-pass-9x' },
  },
  reporter: [['list']],
})
