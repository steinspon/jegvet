// @ts-check
'use strict';

var defineConfig = require('@playwright/test').defineConfig;

module.exports = defineConfig({
  testDir: './test',
  testMatch: /.*\.spec\.js/,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:5500',
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  expect: { timeout: 20000 },
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list']],
  webServer: {
    command: 'node scripts/static-server.js 5500',
    url: 'http://127.0.0.1:5500',
    reuseExistingServer: !process.env.CI
  }
});
