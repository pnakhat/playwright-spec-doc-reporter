import { expect } from "@playwright/test";
import { Given, When, Then } from "./fixtures.js";

Given("I open the Playwright homepage", async ({ page }) => {
  await page.goto("https://playwright.dev");
});

Then("the page title contains {string}", async ({ page }, text: string) => {
  await expect(page).toHaveTitle(new RegExp(text));
});

Then("the hero title mentions {string}", async ({ page }, text: string) => {
  await expect(page.locator(".hero__title")).toContainText(text);
});

When("I click the {string} link", async ({ page }, name: string) => {
  await page.getByRole("link", { name }).first().click();
});

Then("the page URL contains {string}", async ({ page }, fragment: string) => {
  await expect(page).toHaveURL(new RegExp(fragment));
});

Then("the top navigation shows the {string} link", async ({ page }, name: string) => {
  await expect(page.getByRole("navigation").first().getByRole("link", { name, exact: true })).toBeVisible();
});
