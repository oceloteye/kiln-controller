const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Adjust these paths if your environment differs
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8081/';
const SAMPLE_PROFILE = path.resolve(__dirname, '..', 'Test', 'test-fast.json');
const PROFILE_STORAGE_DIR = path.resolve(__dirname, '..', 'storage', 'profiles');

test('import json and save profile', async ({ page }) => {
  await page.goto(BASE_URL);

  // enter edit mode
  await page.click('#btn_new');

  // enable autosave
  await page.locator('#autosave_after_import').check();

  // set file input to sample profile
  const fileInput = await page.$('#importFile');
  await fileInput.setInputFiles(SAMPLE_PROFILE);

  // wait for autosave to complete (server write)
  const importedName = await page.inputValue('#form_profile_name');
  expect(importedName.length).toBeGreaterThan(0);

  const expectedFile = path.join(PROFILE_STORAGE_DIR, importedName + '.json');

  // wait up to 3s for file to be created
  for (let i=0;i<30;i++) {
    if (fs.existsSync(expectedFile)) break;
    await new Promise(r => setTimeout(r, 100));
  }

  expect(fs.existsSync(expectedFile)).toBeTruthy();

  // cleanup: remove created profile
  try { fs.unlinkSync(expectedFile); } catch(e) {}
});
