import { Before, After, BeforeAll, AfterAll, Status } from "@cucumber/cucumber";
import { chromium } from "playwright";

BeforeAll(async function () {
  // Global setup — runs once before all scenarios
});

Before({ tags: "not @api" }, async function () {
  this.browser = await chromium.launch({ headless: true });
  this.context = await this.browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  this.page = await this.context.newPage();
});

After({ tags: "not @api" }, async function (scenario) {
  if (scenario.result?.status === Status.FAILED && this.page) {
    const screenshot = await this.page.screenshot({ fullPage: true });
    await this.attach(screenshot, "image/png");
  }

  if (this.context) await this.context.close();
  if (this.browser) await this.browser.close();
});

AfterAll(async function () {
  // Global teardown
});
