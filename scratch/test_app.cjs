const puppeteer = require('puppeteer-core');

(async () => {
  console.log('🚀 Starting Automated Headless Chrome Excel Import Button Test...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  console.log('Navigating to http://localhost:3001/ ...');
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });

  // Click Sentence Bank tab
  console.log('Clicking "Sentence Bank" tab...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Sentence Bank'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const screenshot = '/home/chaithanya/.gemini/antigravity/brain/e693f0b6-9241-43cc-9ec3-9a9b87e2ae48/excel_import_test.png';
  await page.screenshot({ path: screenshot, fullPage: false });
  console.log(`📸 Excel Import UI Screenshot saved to: ${screenshot}`);

  await browser.close();
  console.log('Browser closed cleanly.');
})();
