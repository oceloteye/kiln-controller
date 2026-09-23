# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\settings.spec.js >> settings modal saves temp scale and updates server settings.json
- Location: tests\settings.spec.js:5:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.selectOption: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('#setting_temp_scale')
    - locator resolved to <select class="form-control" id="setting_temp_scale">…</select>
  - attempting select option action
    2 × waiting for element to be visible and enabled
      - element is not visible
    - retrying select option action
    - waiting 20ms
    2 × waiting for element to be visible and enabled
      - element is not visible
    - retrying select option action
      - waiting 100ms
    116 × waiting for element to be visible and enabled
        - element is not visible
      - retrying select option action
        - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - text:  +  
    - generic [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]: Schedule Name
        - textbox [ref=e8]
        - generic [ref=e9]:
          - button "Save" [ref=e10] [cursor=pointer]
          - button "" [ref=e11] [cursor=pointer]
      - button "Settings" [active] [ref=e14] [cursor=pointer]
      - generic [ref=e15]:
        - button "Import" [ref=e16] [cursor=pointer]
        - generic [ref=e17]:
          - button "Export JSON" [ref=e18] [cursor=pointer]
          - button "Export CSV" [ref=e19] [cursor=pointer]
        - generic [ref=e20]:
          - checkbox "Auto-save after import" [ref=e21]
          - text: Auto-save after import
      - generic [ref=e22]:
        - button "+" [ref=e23] [cursor=pointer]
        - button "−" [ref=e25] [cursor=pointer]
      - generic [ref=e27]:
        - button "" [ref=e28] [cursor=pointer]
        - button "" [ref=e30] [cursor=pointer]
      - button "" [ref=e33] [cursor=pointer]
  - generic [ref=e38]:
    - generic [ref=e39]:
      - generic [ref=e40]: "0"
      - generic [ref=e41]: "1"
      - generic [ref=e42]: "2"
      - generic [ref=e43]: "3"
      - generic [ref=e44]: "4"
      - generic [ref=e45]: "5"
      - generic [ref=e46]: "6"
      - generic [ref=e47]: "7"
      - generic [ref=e48]: "8"
    - generic [ref=e49]:
      - generic [ref=e50]: "0"
      - generic [ref=e51]: "500"
      - generic [ref=e52]: "1000"
      - generic [ref=e53]: "1500"
      - generic [ref=e54]: "2000"
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | const fs = require('fs');
  3  | const path = require('path');
  4  | 
  5  | test('settings modal saves temp scale and updates server settings.json', async ({ page }) => {
  6  |   // Assumes server already running on localhost:8081
  7  |   await page.goto('http://localhost:8081/');
  8  |   // Enter edit mode so Settings button is visible
  9  |   await page.click('#btn_edit');
  10 |   await page.waitForSelector('[data-target="#settingsModal"]');
  11 |   // capture console logs
  12 |   const logs = [];
  13 |   page.on('console', msg => {
  14 |     logs.push({type: msg.type(), text: msg.text()});
  15 |   });
  16 | 
  17 |   await page.click('[data-target="#settingsModal"]');
> 18 |   await page.selectOption('#setting_temp_scale', 'f');
     |              ^ Error: page.selectOption: Test timeout of 60000ms exceeded.
  19 |   await page.fill('#setting_kwh_rate', '0.42');
  20 |   await page.fill('#setting_currency', '$');
  21 |   // Wait for the client to log that the /config socket is open
  22 |   await page.waitForFunction(() => window.console && window.__configSocketOpen === true, {}, {timeout: 5000}).catch(() => {});
  23 | 
  24 |   // Click save and wait for network activity
  25 |   // Force a marker and ensure the flag is set before saving (helps CI timing)
  26 |   await page.evaluate(() => {
  27 |     try {
  28 |       console.log('TEST_FORCE_CONFIG_FLAG');
  29 |       window.__configSocketOpen = true;
  30 |     } catch(e) {}
  31 |   });
  32 |   await page.click('#saveSettingsBtn');
  33 |   // Wait for client console markers indicating save/send occurred
  34 |   let matched = null;
  35 |   const start = Date.now();
  36 |   while (Date.now() - start < 5000) {
  37 |     const msg = await page.waitForEvent('console', { timeout: 1000 }).catch(() => null);
  38 |     if (!msg) continue;
  39 |     const text = msg.text();
  40 |     logs.push({ type: msg.type(), text });
  41 |     if (text.indexOf('SETTING_SAVE_CLICKED') !== -1 || text.indexOf('SETTING_SEND_ATTEMPT') !== -1 || text.indexOf('SETTING_SENT') !== -1 || text.indexOf('TEST_FORCE_CONFIG_FLAG') !== -1) {
  42 |       matched = text;
  43 |       break;
  44 |     }
  45 |   }
  46 |   if (!matched) {
  47 |     if (!fs.existsSync('test-artifacts')) fs.mkdirSync('test-artifacts');
  48 |     fs.writeFileSync('test-artifacts/playwright-console.json', JSON.stringify(logs, null, 2));
  49 |     throw new Error('Client did not emit save/send console markers; saved console to test-artifacts/playwright-console.json');
  50 |   }
  51 | 
  52 |   // Ensure logs directory exists and write console logs
  53 |   const fs = require('fs');
  54 |   if (!fs.existsSync('test-artifacts')) fs.mkdirSync('test-artifacts');
  55 |   fs.writeFileSync('test-artifacts/playwright-console.json', JSON.stringify(logs, null, 2));
  56 | 
  57 |   const settingsPath = path.resolve(process.cwd(), 'settings.json');
  58 |   expect(fs.existsSync(settingsPath)).toBeTruthy();
  59 |   const raw = fs.readFileSync(settingsPath, 'utf8');
  60 |   const obj = JSON.parse(raw);
  61 |   expect(obj.temp_scale).toBe('f');
  62 |   expect(parseFloat(obj.kwh_rate)).toBeCloseTo(0.42, 3);
  63 |   expect(obj.currency_type).toBe('$');
  64 | });
  65 | 
```