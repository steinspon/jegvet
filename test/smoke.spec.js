'use strict';

var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;

test('home supports language and night mode toggles', async function ({ page }) {
  await page.goto('/');

  await expect(page.getByRole('searchbox', { name: 'Search' })).toBeVisible();

  await page.goto('/settings.html');
  await page.locator('label[for="lang-toggle"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'nb');
  await expect(page.locator('#lang-toggle')).toBeChecked();

  if (await page.locator('html').getAttribute('data-theme') !== 'night') {
    await page.locator('label[for="theme-toggle"]').click();
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
});

test('tools subgroup back button returns to the previous level', async function ({ page }) {
  await page.goto('/tools.html');

  await page.getByRole('button', { name: 'Exotics' }).click();
  await expect(page.getByRole('heading', { name: 'Exotics' })).toBeVisible();

  await page.getByRole('button', { name: /Back to Tools & Calculators/ }).click();
  await expect(page.getByRole('heading', { name: 'Tools & Calculators' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Back to/ })).toBeHidden();
});

test('calculator accepts comma decimal input', async function ({ page }) {
  await page.goto('/kitty-magic-calculator.html');

  await page.locator('#weight-kg').fill('4,2');
  await page.locator('#mood-choice').selectOption('snill');
  await page.locator('#bcs-choice').selectOption('slank');

  await expect(page.locator('#dose-results')).toContainText('Dexmedetomidine');
  await expect(page.locator('#calc-error')).toHaveText('');
});

test('dog antihistamine calculator shows comparison table after weight input', async function ({ page }) {
  await page.goto('/dog-antihistamine-calculator.html');

  await page.locator('#weight-kg').fill('12,5');

  await expect(page.locator('#dose-results')).toBeVisible();
  await expect(page.locator('#atarax-per-dose')).toHaveText('27.5 mg');
  await expect(page.locator('#aerius-per-dose')).toHaveText('6.25 mg');
  await expect(page.locator('#atarax-journal-text')).toContainText('Atarax 25 mg, give 1 tablet every 8 hours. Start today.');
  await expect(page.locator('#atarax-tablet-options')).toContainText('25 mg: 1 tablet (25 mg) = 25 mg');
  await expect(page.locator('#aerius-tablet-options')).toContainText('5 mg: 1 tablet (5 mg)');
  await expect(page.locator('#aerius-liquid-option')).toContainText('Not relevant');
  await expect(page.locator('#aerius-journal-text')).toContainText('Aerius 5 mg, give 1 tablet every 12 hours. Start today.');
});

test('dog antihistamine calculator shows Atarax combination and Aerius liquid when practical', async function ({ page }) {
  await page.goto('/dog-antihistamine-calculator.html');

  await page.locator('#weight-kg').fill('15');

  await expect(page.locator('#atarax-tablet-options')).toContainText('25 mg: 1 tablet + 10 mg: 1 tablet = 35 mg');
  await expect(page.locator('#atarax-journal-text')).toContainText('Atarax 25 mg, give 1 tablet and Atarax 10 mg, give 1 tablet every 8 hours. Start today.');

  await page.locator('#weight-kg').fill('8');

  await expect(page.locator('#aerius-liquid-option')).toContainText('0.5 mg/ml: 8 ml');
  await expect(page.locator('#aerius-journal-text')).toContainText('Aerius 5 mg, give 1 tablet every 12 hours. Start today.');
  await expect(page.locator('#aerius-journal-text')).toContainText('Aerius liquid 0.5 mg/ml, give 8 ml every 12 hours. Start today.');
});

test('dog antihistamine calculator shows one practical Atarax tablet option for large dogs', async function ({ page }) {
  await page.goto('/dog-antihistamine-calculator.html');

  await page.locator('#weight-kg').fill('40');

  await expect(page.locator('#atarax-tablet-options')).toHaveText('25 mg: 3.5 tablets (87.5 mg) = 87.5 mg');
});

test('dog B2 cardiac sedation calculator switches protocol by procedure type', async function ({ page }) {
  await page.goto('/dog-b2-cardiac-sedation-calculator.html');

  await page.locator('#weight-kg').fill('10,5');
  await expect(page.locator('#premed-results')).toContainText('Methadone');
  await expect(page.locator('#premed-combined')).toContainText('0.22 - 0.44 ml');

  await page.locator('#procedure-type').selectOption('nonpainful');
  await expect(page.locator('#premed-results')).toContainText('Butorphanol');
  await expect(page.locator('#premed-results')).not.toContainText('Methadone');
});

test('search finds calculator content', async function ({ page }) {
  await page.goto('/search.html?q=kitty%20magic');

  await expect(page.locator('#search-summary')).toContainText('result');
  await expect(page.getByRole('link', { name: /Kitty Magic/i }).first()).toBeVisible();
});

test('wiki navigation shows translated folder labels', async function ({ page }) {
  await page.goto('/wiki.html?page=Exotics%2FReptile%20Medicine%2FDiagnostics%2Foversikt.md');

  var nav = page.locator('#wiki-nav');
  await expect(nav.getByText('Exotics', { exact: true })).toBeVisible();
  await expect(nav.getByText('Reptile Medicine', { exact: true })).toBeVisible();
  await expect(nav.getByText('Diagnostics', { exact: true })).toBeVisible();
  await expect(nav.getByText('Husbandry and Biology', { exact: true })).toBeVisible();
  await expect(nav.getByText('Medicine and Surgery', { exact: true })).toBeVisible();
  await expect(nav.getByText(/^Exotics:/)).toHaveCount(0);
});

test('search finds wiki pages by their translated species name', async function ({ page }) {
  await page.goto('/search.html?q=bearded%20dragon');

  await expect(page.locator('#search-summary')).toContainText('result');
  await expect(page.getByRole('link', { name: /Bearded Dragon/i }).first()).toBeVisible();
});

test('desktop widths match page type without changing mobile spacing', async function ({ page }) {
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto('/');
  await expect(page.locator('.layout-card')).toHaveCSS('max-width', '760px');
  await expect(page.locator('.app-topbar')).toHaveCSS('max-width', '760px');

  await page.setViewportSize({ width: 800, height: 900 });
  await expect(page.locator('.layout-card')).toHaveCSS('width', '744px');
  await expect(page.locator('.app-topbar')).toHaveCSS('width', '744px');

  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto('/kitty-magic-calculator.html');
  await expect(page.locator('.layout-card')).toHaveCSS('max-width', '1000px');
  await expect(page.locator('.app-topbar')).toHaveCSS('max-width', '1000px');

  await page.goto('/wiki.html');
  await expect(page.locator('.layout-card')).toHaveCSS('max-width', '1180px');
  await expect(page.locator('.app-topbar')).toHaveCSS('max-width', '1180px');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.layout-card')).toHaveCSS('width', '350px');
});
