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
