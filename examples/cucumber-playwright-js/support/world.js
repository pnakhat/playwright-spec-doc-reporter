import { setWorldConstructor, World } from "@cucumber/cucumber";
import { chromium } from "playwright";

class PlaywrightWorld extends World {
  /** @type {import('playwright').Browser} */
  browser;
  /** @type {import('playwright').BrowserContext} */
  context;
  /** @type {import('playwright').Page} */
  page;

  /** Base URL for UI tests */
  todoAppUrl = "https://demo.playwright.dev/todomvc";

  /** Base URL for API tests */
  apiBaseUrl = "https://jsonplaceholder.typicode.com";

  /** Last API response (for API step defs) */
  lastResponse = null;

  constructor(options) {
    super(options);
  }
}

setWorldConstructor(PlaywrightWorld);
