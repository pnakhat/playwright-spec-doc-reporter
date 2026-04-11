import { expect } from "@playwright/test";
import { Given, When, Then } from "../support/fixtures.js";

Given("I am logged in as {string}", async ({ page, baseUrl }, username: string) => {
  await page.goto(baseUrl);
  await page.fill("#user-name", username);
  await page.fill("#password", "secret_sauce");
  await page.click("#login-button");
  await expect(page).toHaveURL(/inventory/);
});

Given("I am on the products page", async ({ page }) => {
  await expect(page).toHaveURL(/inventory/);
});

When("I add {string} to the cart", async ({ page }, productName: string) => {
  const productCard = page
    .locator(".inventory_item")
    .filter({ hasText: productName });
  await productCard.locator("button[data-test*='add-to-cart']").click();
});

Then(
  "the cart badge should show {string}",
  async ({ page }, count: string) => {
    await expect(page.locator(".shopping_cart_badge")).toHaveText(count);
  }
);

Then(
  "{string} should appear in the cart",
  async ({ page }, productName: string) => {
    await page.click(".shopping_cart_link");
    await expect(
      page.locator(".cart_item_label").filter({ hasText: productName })
    ).toBeVisible();
  }
);

Given(
  "I have added {string} to the cart",
  async ({ page }, productName: string) => {
    const productCard = page
      .locator(".inventory_item")
      .filter({ hasText: productName });
    await productCard.locator("button[data-test*='add-to-cart']").click();
  }
);

When(
  "I remove {string} from the cart",
  async ({ page }, productName: string) => {
    const productCard = page
      .locator(".inventory_item")
      .filter({ hasText: productName });
    await productCard.locator("button[data-test*='remove']").click();
  }
);

Then("the cart badge should not be visible", async ({ page }) => {
  await expect(page.locator(".shopping_cart_badge")).not.toBeVisible();
});

When("I proceed to checkout", async ({ page }) => {
  await page.click(".shopping_cart_link");
  await page.click("[data-test='checkout']");
});

When(
  "I enter my details {string} {string} {string}",
  async ({ page }, firstName: string, lastName: string, zip: string) => {
    await page.fill("[data-test='firstName']", firstName);
    await page.fill("[data-test='lastName']", lastName);
    await page.fill("[data-test='postalCode']", zip);
    await page.click("[data-test='continue']");
  }
);

When("I complete the order", async ({ page }) => {
  await page.click("[data-test='finish']");
});

Then("I should see the order confirmation page", async ({ page }) => {
  await expect(page.locator(".complete-header")).toBeVisible();
  await expect(page.locator(".complete-header")).toContainText("Thank you");
});
