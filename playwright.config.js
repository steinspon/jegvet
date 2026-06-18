// @ts-check
'use strict';

var defineConfig = require('@playwright/test').defineConfig;

module.exports = defineConfig({
  testDir: './test',
  testMatch: /.*\.spec\.js/,
  use: {
    baseURL: 'http://127.0.0.1:5500',
    viewport: { width: 390, height: 844 }
  },
  webServer: {
    command: 'node scripts/static-server.js 5500',
    url: 'http://127.0.0.1:5500',
    reuseExistingServer: !process.env.CI
  }
});
