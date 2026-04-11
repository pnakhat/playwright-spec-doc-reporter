import { expect } from "@playwright/test";
import { Given, When, Then } from "../support/fixtures.js";

Given("the application is running", async ({ page, baseUrl }) => {
  await page.goto(baseUrl);
  await expect(page).toHaveURL(/saucedemo/);
});

Given("I am on the login page", async ({ page, baseUrl }) => {
  await page.goto(baseUrl);
  await expect(page.locator("#user-name")).toBeVisible();
});

When(
  "I enter username {string} and password {string}",
  async ({ page }, username: string, password: string) => {
    await page.fill("#user-name", username);
    await page.fill("#password", password);
  }
);

When("I click the login button", async ({ page, baseUrl, apiRequest, apiResponse }) => {
  // Annotate the login POST so it appears in the glossy report's API traffic panel
  apiRequest("POST", `${baseUrl}/`, { username: "(redacted)", password: "(redacted)" });
  await page.click("#login-button");
  apiResponse(200);
});

Then("I should see the products page", async ({ page }) => {
  await expect(page).toHaveURL(/inventory/);
  await expect(page.locator(".title")).toBeVisible();
});

Then(
  "the page title should be {string}",
  async ({ page }, title: string) => {
    await expect(page.locator(".title")).toHaveText(title);
  }
);

When("I reload the page", async ({ page }) => {
  await page.reload();
});

Then("I should still see the products page", async ({ page }) => {
  await expect(page).toHaveURL(/inventory/);
});

Then(
  "I should see an error message {string}",
  async ({ page }, message: string) => {
    const error = page.locator("[data-test='error']");
    await expect(error).toBeVisible();
    await expect(error).toContainText(message);
  }
);
