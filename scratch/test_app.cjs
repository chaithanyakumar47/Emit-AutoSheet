const puppeteer = require('puppeteer-core');

(async () => {
  console.log('🚀 Starting Automated Headless Chrome Company Holidays Test...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  console.log('Navigating to http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // Click Bulk Range & Gaps tab
  console.log('Clicking "Bulk Range & Gaps" tab...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Bulk Range & Gaps'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Click Audit Mistakes button
  console.log('Clicking "Audit Mistakes" button...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Audit Mistakes'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const screenshot = '/home/chaithanya/.gemini/antigravity/brain/e693f0b6-9241-43cc-9ec3-9a9b87e2ae48/company_holidays_audit_test.png';
  await page.screenshot({ path: screenshot, fullPage: false });
  console.log(`📸 Company Holidays Audit Screenshot saved to: ${screenshot}`);

  await browser.close();
  console.log('Browser closed cleanly.');
})();
