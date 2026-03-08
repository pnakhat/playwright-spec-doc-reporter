// @ts-check
import { test, expect } from "@playwright/test";
import { addFeature, addScenario, addBehaviour } from "../../annotations.mjs";

const PASSWORD = "secret_sauce";

/** @param {import("@playwright/test").Page} page */
async function loginStandard(page) {
  await page.goto("/");
  await page.getByPlaceholder("Username").fill("standard_user");
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL(/inventory\.html/);
}

/** @param {import("@playwright/test").Page} page */
async function addAllItems(page) {
  const buttons = page.getByRole("button", { name: "Add to cart" });
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    await buttons.nth(0).click();
  }
}

test.describe("Checkout Flow", () => {
  test.beforeEach(() => {
    addFeature("Checkout Flow", "As a customer I want to complete a purchase end-to-end");
  });

  test("complete checkout with one item @smoke @critical", async ({ page }) => {
    addScenario("Verifies a standard user can add one item and complete checkout");

    addBehaviour("User logs in and navigates to inventory");
    await loginStandard(page);

    addBehaviour("User adds the first item to cart");
    await page.getByRole("button", { name: "Add to cart" }).first().click();
    await expect(page.locator(".shopping_cart_badge")).toHaveText("1");

    addBehaviour("User opens the cart");
    await page.locator(".shopping_cart_link").click();
    await expect(page).toHaveURL(/cart\.html/);
    await expect(page.locator(".cart_item")).toHaveCount(1);

    addBehaviour("User proceeds to checkout step 1");
    await page.getByRole("button", { name: "Checkout" }).click();
    await expect(page).toHaveURL(/checkout-step-one\.html/);

    addBehaviour("User fills in personal details");
    await page.getByPlaceholder("First Name").fill("Test");
    await page.getByPlaceholder("Last Name").fill("User");
    await page.getByPlaceholder("Zip/Postal Code").fill("12345");
    await page.getByRole("button", { name: "Continue" }).click();

    addBehaviour("User reviews order summary and confirms");
    await expect(page).toHaveURL(/checkout-step-two\.html/);
    await page.getByRole("button", { name: "Finish" }).click();

    addBehaviour("Order confirmation page is shown");
    await expect(page).toHaveURL(/checkout-complete\.html/);
    await expect(page.getByText("Thank you for your order!")).toBeVisible();
  });

  test("checkout requires first name @validation", async ({ page }) => {
    addScenario("Verifies that leaving first name blank shows a validation error");

    addBehaviour("User logs in, adds item, goes to checkout step 1");
    await loginStandard(page);
    await page.getByRole("button", { name: "Add to cart" }).first().click();
    await page.locator(".shopping_cart_link").click();
    await page.getByRole("button", { name: "Checkout" }).click();

    addBehaviour("User submits without filling any fields");
    await page.getByRole("button", { name: "Continue" }).click();

    addBehaviour("Validation error is shown for first name");
    await expect(page.locator('[data-test="error"]')).toContainText("First Name is required");
  });

  test("checkout requires last name @validation", async ({ page }) => {
    addScenario("Verifies that leaving last name blank shows a validation error");

    addBehaviour("User logs in, adds item, goes to checkout step 1");
    await loginStandard(page);
    await page.getByRole("button", { name: "Add to cart" }).first().click();
    await page.locator(".shopping_cart_link").click();
    await page.getByRole("button", { name: "Checkout" }).click();

    addBehaviour("User fills only first name and submits");
    await page.getByPlaceholder("First Name").fill("Test");
    await page.getByRole("button", { name: "Continue" }).click();

    addBehaviour("Validation error is shown for last name");
    await expect(page.locator('[data-test="error"]')).toContainText("Last Name is required");
  });

  test("checkout requires postal code @validation", async ({ page }) => {
    addScenario("Verifies that leaving postal code blank shows a validation error");

    addBehaviour("User logs in, adds item, goes to checkout step 1");
    await loginStandard(page);
    await page.getByRole("button", { name: "Add to cart" }).first().click();
    await page.locator(".shopping_cart_link").click();
    await page.getByRole("button", { name: "Checkout" }).click();

    addBehaviour("User fills first and last name but not postal code");
    await page.getByPlaceholder("First Name").fill("Test");
    await page.getByPlaceholder("Last Name").fill("User");
    await page.getByRole("button", { name: "Continue" }).click();

    addBehaviour("Validation error is shown for postal code");
    await expect(page.locator('[data-test="error"]')).toContainText("Postal Code is required");
  });

  test("checkout with all 6 items shows correct count @regression", async ({ page }) => {
    addScenario("Verifies cart badge shows 6 when all items are added");

    addBehaviour("User logs in and adds all available products");
    await loginStandard(page);
    await addAllItems(page);

    addBehaviour("Cart badge shows 6 items");
    await expect(page.locator(".shopping_cart_badge")).toHaveText("6");

    addBehaviour("Cart page lists 6 items");
    await page.locator(".shopping_cart_link").click();
    await expect(page.locator(".cart_item")).toHaveCount(6);
  });

  test("cancel checkout returns to inventory @regression", async ({ page }) => {
    addScenario("Verifies cancel button on checkout step 1 navigates back to inventory");

    addBehaviour("User reaches checkout step 1");
    await loginStandard(page);
    await page.getByRole("button", { name: "Add to cart" }).first().click();
    await page.locator(".shopping_cart_link").click();
    await page.getByRole("button", { name: "Checkout" }).click();

    addBehaviour("User clicks Cancel");
    await page.getByRole("button", { name: "Cancel" }).click();

    addBehaviour("User is returned to the cart page");
    await expect(page).toHaveURL(/cart\.html/);
  });
});

test.describe("Product Detail", () => {
  test.beforeEach(() => {
    addFeature("Product Detail", "As a customer I want to view product details before buying");
  });

  test("clicking product name opens detail page @smoke", async ({ page }) => {
    addScenario("Verifies product name link navigates to the product detail page");

    addBehaviour("User logs in and clicks the first product name");
    await loginStandard(page);
    await page.locator(".inventory_item_name").first().click();

    addBehaviour("Product detail page is shown with name, description and price");
    await expect(page).toHaveURL(/inventory-item\.html/);
    await expect(page.locator(".inventory_details_name")).toBeVisible();
    await expect(page.locator(".inventory_details_price")).toBeVisible();
    await expect(page.locator(".inventory_details_desc")).toBeVisible();
  });

  test("back button on detail page returns to inventory @smoke", async ({ page }) => {
    addScenario("Verifies the Back button on a product detail page navigates back");

    addBehaviour("User opens a product detail page");
    await loginStandard(page);
    await page.locator(".inventory_item_name").first().click();
    await expect(page).toHaveURL(/inventory-item\.html/);

    addBehaviour("User clicks Back to Products");
    await page.getByRole("button", { name: "Back to products" }).click();

    addBehaviour("User is back on the inventory page");
    await expect(page).toHaveURL(/inventory\.html/);
  });

  test("add to cart from detail page updates badge @regression", async ({ page }) => {
    addScenario("Verifies Add to cart button on product detail page works");

    addBehaviour("User opens a product detail page");
    await loginStandard(page);
    await page.locator(".inventory_item_name").first().click();

    addBehaviour("User clicks Add to cart from the detail page");
    await page.getByRole("button", { name: "Add to cart" }).click();

    addBehaviour("Cart badge updates to 1");
    await expect(page.locator(".shopping_cart_badge")).toHaveText("1");
  });
});
