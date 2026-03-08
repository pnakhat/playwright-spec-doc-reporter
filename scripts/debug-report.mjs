import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true});
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERROR:', e.message));
await page.goto('http://127.0.0.1:4173/examples/saucedemo-demo/glossy-report/index.html');
await page.waitForTimeout(2000);

// Check the raw report data for steps screenshots
const stepScreenshotsInData = await page.evaluate(() => {
  const script = document.getElementById('report-data');
  if (!script) return 'NO_SCRIPT_TAG';
  const data = JSON.parse(script.textContent);
  return data.tests.map(t => ({
    title: t.title,
    status: t.status,
    stepCount: (t.steps || []).length,
    stepsWithScreenshots: (t.steps || []).filter(s => s.screenshots && s.screenshots.length > 0).map(s => ({
      title: s.title,
      screenshots: s.screenshots
    }))
  }));
});
console.log('DATA:', JSON.stringify(stepScreenshotsInData, null, 2));

// Expand first suite
const suiteHeaders = await page.locator('.suite-header').all();
if (suiteHeaders.length > 0) await suiteHeaders[0].click();
await page.waitForTimeout(300);

// Expand all test details
const testHeaders = await page.locator('.test-detail-header').all();
console.log('TEST_HEADERS:', testHeaders.length);
for (const h of testHeaders) {
  try { await h.click({timeout: 1000}); } catch(e) {}
}
await page.waitForTimeout(500);

// Count step screenshots in DOM
const stepScreenshots = await page.locator('.step-screenshot').count();
console.log('DOM_STEP_SCREENSHOTS:', stepScreenshots);

// Get all img elements info
const allImgs = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('img')).map(img => ({
    cls: img.className,
    src: (img.getAttribute('src') || '').substring(0, 80),
    visible: img.offsetParent !== null
  }));
});
console.log('ALL_IMGS:', allImgs.length);
allImgs.forEach((img, i) => {
  if (img.cls.includes('step')) console.log('  IMG', i, img);
});

await browser.close();
