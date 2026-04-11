import { Before, After, BeforeAll, AfterAll, Status } from "@cucumber/cucumber";
import { chromium } from "@playwright/test";
import type { ICustomWorld } from "./world.js";

BeforeAll(async function () {
  // Any global setup
});

Before(async function (this: ICustomWorld) {
  this.browser = await chromium.launch({ headless: true });
  this.context = await this.browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: process.env.RECORD_VIDEO
      ? { dir: "test-results/videos" }
      : undefined,
  });
  this.page = await this.context.newPage();
});

After(async function (this: ICustomWorld, scenario) {
  // Take screenshot on failure
  if (scenario.result?.status === Status.FAILED) {
    const screenshot = await this.page.screenshot({ fullPage: true });
    await this.attach(screenshot, "image/png");
  }

  await this.context.close();
  await this.browser.close();
});

AfterAll(async function () {
  // Any global teardown
});
