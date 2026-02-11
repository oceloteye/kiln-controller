const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE:', msg.text()));

  const url = process.env.URL || 'http://localhost:8081/';
  console.log('Opening', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

  // Open settings modal
  await page.waitForSelector('#btn_settings', { visible: true, timeout: 5000 });
  await page.click('#btn_settings');

  // Wait for modal to be visible
  await page.waitForSelector('#settingsModal', { visible: true, timeout: 5000 });
  console.log('Settings modal opened');

  // Click Save
  await page.waitForSelector('#settings_save_btn', { visible: true, timeout: 3000 });
  await page.click('#settings_save_btn');

  // Give script a moment to perform hide logic and websocket ack path
  await page.waitForTimeout(800);

  // Evaluate whether modal is hidden and no focused element is inside a container with aria-hidden=true
  const result = await page.evaluate(() => {
    const modal = document.getElementById('settingsModal');
    const backdrop = document.querySelector('.modal-backdrop');
    const visible = modal && window.getComputedStyle(modal).display !== 'none' && modal.classList.contains('in');
    const active = document.activeElement;
    // find if any ancestor of active has aria-hidden="true"
    let ancestor = active;
    while (ancestor) {
      if (ancestor.getAttribute && ancestor.getAttribute('aria-hidden') === 'true') {
        return { ok: false, reason: 'Focused element has an ancestor with aria-hidden=true', activeTag: active.tagName };
      }
      ancestor = ancestor.parentElement;
    }
    if (visible) return { ok: false, reason: 'Modal is still visible' };
    if (backdrop) return { ok: false, reason: 'Modal backdrop still present' };
    return { ok: true };
  });

  if (result.ok) {
    console.log('OK: modal hidden and no aria-hidden focus issue');
    await browser.close();
    process.exit(0);
  } else {
    console.error('FAIL:', result.reason, result);
    await browser.screenshot({ path: 'Test/modal_e2e_failure.png', fullPage: true }).catch(()=>{});
    await browser.close();
    process.exit(1);
  }
})();
