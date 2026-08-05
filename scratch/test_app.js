const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  console.log('🚀 Starting Automated Headless Chrome UI Test...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[BROWSER ${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[BROWSER ERROR] ${err.toString()}`));

  try {
    console.log('Navigating to http://localhost:3001/ ...');
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });

    const title = await page.title();
    console.log(`Page title: "${title}"`);

    // Click Generate Timesheet button
    const generateBtn = await page.waitForSelector('button:has-text("Generate Timesheet")', { timeout: 5000 }).catch(() => null);
    if (generateBtn) {
      console.log('Clicking "Generate Timesheet" button...');
      await generateBtn.click();
      await page.waitForTimeout(1000);
    } else {
      console.log('Attempting to find Generate button by text...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent.includes('Generate Timesheet'));
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 1000));
    }

    // Take screenshot of timesheet studio
    const screenshotPath = '/home/chaithanya/.gemini/antigravity/brain/e693f0b6-9241-43cc-9ec3-9a9b87e2ae48/automated_browser_test.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📸 Screenshot saved to: ${screenshotPath}`);

    // Check UI elements
    const timelineItems = await page.$$eval('.card-surface', items => items.length);
    console.log(`Timeline activity cards count: ${timelineItems}`);

    console.log('\n--- BROWSER CONSOLE LOGS ---');
    consoleLogs.forEach(l => console.log(l));
  } catch (err) {
    console.error('Browser automation error:', err);
  } finally {
    await browser.close();
    console.log('Browser closed cleanly.');
  }
})();
