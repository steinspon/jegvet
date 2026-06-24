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

test('search finds calculator content', async function ({ page }) {
  await page.goto('/search.html?q=kitty%20magic');

  await expect(page.locator('#search-summary')).toContainText('result');
  await expect(page.getByRole('link', { name: /Kitty Magic/i }).first()).toBeVisible();
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
