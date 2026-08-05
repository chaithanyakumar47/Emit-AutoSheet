const puppeteer = require('puppeteer-core');

(async () => {
  console.log('🚀 Starting Automated Headless Chrome Help Modal Test...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  console.log('Navigating to http://localhost:3001/ ...');
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });

  // Click the ? Help button in header
  console.log('Clicking ? Help button...');
  await page.evaluate(() => {
    const helpBtn = document.querySelector('button[title="Help & Complete User Guide"]');
    if (helpBtn) helpBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const helpScreenshot = '/home/chaithanya/.gemini/antigravity/brain/e693f0b6-9241-43cc-9ec3-9a9b87e2ae48/help_modal_test.png';
  await page.screenshot({ path: helpScreenshot, fullPage: false });
  console.log(`📸 Help Modal Screenshot saved to: ${helpScreenshot}`);

  await browser.close();
  console.log('Browser closed cleanly.');
})();
