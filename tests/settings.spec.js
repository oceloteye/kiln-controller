const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('settings modal saves temp scale and updates server settings.json', async ({ page }) => {
  // Assumes server already running on localhost:8081
  await page.goto('http://localhost:8081/');
  await page.click('button:has-text("Settings")');
  await page.selectOption('#setting_temp_scale', 'f');
  await page.fill('#setting_kwh_rate', '0.42');
  await page.fill('#setting_currency', '$');
  await page.click('#saveSettingsBtn');

  // Wait a moment for server to write settings.json
  await page.waitForTimeout(500);

  const settingsPath = path.resolve(process.cwd(), 'settings.json');
  expect(fs.existsSync(settingsPath)).toBeTruthy();
  const raw = fs.readFileSync(settingsPath, 'utf8');
  const obj = JSON.parse(raw);
  expect(obj.temp_scale).toBe('f');
  expect(parseFloat(obj.kwh_rate)).toBeCloseTo(0.42, 3);
  expect(obj.currency_type).toBe('$');
});
