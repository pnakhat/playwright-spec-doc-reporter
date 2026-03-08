import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const bad = [];
page.on('response', r => { if (r.status() === 404) bad.push(r.url()); });
page.on('pageerror', e => console.log('PAGEERROR:', e.message));

await page.goto('http://127.0.0.1:4173/examples/saucedemo-demo/glossy-report/index.html');
await page.waitForTimeout(2000);

// Check for suite blocks (spec files)
const suiteCount = await page.evaluate(() => document.querySelectorAll('.suite-block').length);
console.log('SUITE_BLOCKS:', suiteCount);

// Check for test detail blocks
const testBlocks = await page.evaluate(() => document.querySelectorAll('.test-detail-block').length);
console.log('TEST_DETAIL_BLOCKS:', testBlocks);

// Check for steps tables
const stepsTables = await page.evaluate(() => document.querySelectorAll('.steps-table').length);
console.log('STEPS_TABLES:', stepsTables);

// Check for step rows
const stepRows = await page.evaluate(() => document.querySelectorAll('.step-row').length);
console.log('STEP_ROWS:', stepRows);

// Check for step screenshots
const stepScreenshots = await page.evaluate(() => document.querySelectorAll('.step-screenshot').length);
console.log('STEP_SCREENSHOTS:', stepScreenshots);

// Check for video elements
const videos = await page.evaluate(() => document.querySelectorAll('video').length);
console.log('VIDEOS:', videos);

console.log('404_COUNT', bad.length);
if (bad.length > 0) console.log('404_URLS', JSON.stringify([...new Set(bad)].slice(0, 5)));
await browser.close();
