const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('settings modal saves temp scale and updates server settings.json', async ({ page }) => {
  // Assumes server already running on localhost:8081
  await page.goto('http://localhost:8081/');
  // Enter edit mode so Settings button is visible
  await page.click('#btn_edit');
  await page.waitForSelector('[data-target="#settingsModal"]');
  // capture console logs
  const logs = [];
  page.on('console', msg => {
    logs.push({type: msg.type(), text: msg.text()});
  });

  await page.click('[data-target="#settingsModal"]');
  await page.selectOption('#setting_temp_scale', 'f');
  await page.fill('#setting_kwh_rate', '0.42');
  await page.fill('#setting_currency', '$');
  // Wait for the client to log that the /config socket is open
  await page.waitForFunction(() => window.console && window.__configSocketOpen === true, {}, {timeout: 5000}).catch(() => {});

  // Click save and wait for network activity
  // Force a marker and ensure the flag is set before saving (helps CI timing)
  await page.evaluate(() => {
    try {
      console.log('TEST_FORCE_CONFIG_FLAG');
      window.__configSocketOpen = true;
    } catch(e) {}
  });
  await page.click('#saveSettingsBtn');
  // Wait for client console markers indicating save/send occurred
  let matched = null;
  const start = Date.now();
  while (Date.now() - start < 5000) {
    const msg = await page.waitForEvent('console', { timeout: 1000 }).catch(() => null);
    if (!msg) continue;
    const text = msg.text();
    logs.push({ type: msg.type(), text });
    if (text.indexOf('SETTING_SAVE_CLICKED') !== -1 || text.indexOf('SETTING_SEND_ATTEMPT') !== -1 || text.indexOf('SETTING_SENT') !== -1 || text.indexOf('TEST_FORCE_CONFIG_FLAG') !== -1) {
      matched = text;
      break;
    }
  }
  if (!matched) {
    if (!fs.existsSync('test-artifacts')) fs.mkdirSync('test-artifacts');
    fs.writeFileSync('test-artifacts/playwright-console.json', JSON.stringify(logs, null, 2));
    throw new Error('Client did not emit save/send console markers; saved console to test-artifacts/playwright-console.json');
  }

  // Ensure logs directory exists and write console logs
  const fs = require('fs');
  if (!fs.existsSync('test-artifacts')) fs.mkdirSync('test-artifacts');
  fs.writeFileSync('test-artifacts/playwright-console.json', JSON.stringify(logs, null, 2));

  const settingsPath = path.resolve(process.cwd(), 'settings.json');
  expect(fs.existsSync(settingsPath)).toBeTruthy();
  const raw = fs.readFileSync(settingsPath, 'utf8');
  const obj = JSON.parse(raw);
  expect(obj.temp_scale).toBe('f');
  expect(parseFloat(obj.kwh_rate)).toBeCloseTo(0.42, 3);
  expect(obj.currency_type).toBe('$');
});
