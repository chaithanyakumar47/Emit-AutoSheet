const puppeteer = require('puppeteer-core');

(async () => {
  console.log('🚀 Starting Automated Headless Chrome Single User Guide Test...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  console.log('Navigating to http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });

  // Click floating User Guide button
  console.log('Clicking floating User Guide button...');
  await page.evaluate(() => {
    const btn = document.querySelector('button[title="Open Complete User Guide"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  const screenshot = '/home/chaithanya/.gemini/antigravity/brain/e693f0b6-9241-43cc-9ec3-9a9b87e2ae48/updated_help_guide_test.png';
  await page.screenshot({ path: screenshot, fullPage: false });
  console.log(`📸 Updated Help Guide Screenshot saved to: ${screenshot}`);

  await browser.close();
  console.log('Browser closed cleanly.');
})();
