import { expect, test } from "@playwright/test";
import { addBehaviour, addFeature, addScenario } from "../../annotations.mjs";

const USERS = {
  standard: "standard_user",
  lockedOut: "locked_out_user"
};

const PASSWORD = "secret_sauce";

async function login(page: import("@playwright/test").Page, username: string): Promise<void> {
  await page.goto("/");
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
}

test.describe("Shopping Cart", () => {
  test.beforeEach(() => {
    addFeature("Shopping Cart", "As a customer I want to browse and add products to my cart");
  });

  test("standard user can login and add item to cart @smoke @critical", async ({ page }, testInfo) => {
    addScenario("Verifies that a standard user can log in and add the first product to the cart");

    addBehaviour("User navigates to the login page and submits valid credentials");
    await login(page, USERS.standard);
    await expect(page).toHaveURL(/inventory\.html/);
    await expect(page.getByText("Products")).toBeVisible();

    await testInfo.attach("products-page", {
      body: await page.screenshot(),
      contentType: "image/png",
    });

    addBehaviour("User adds the first product to the cart");
    await page.getByRole("button", { name: "Add to cart" }).first().click();

    addBehaviour("Cart badge updates to reflect one item");
    await expect(page.locator(".shopping_cart_badge")).toHaveText("1");

    await testInfo.attach("cart-badge-visible", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });
});

test.describe("Authentication", () => {
  test.beforeEach(() => {
    addFeature("Authentication", "As a system I want to prevent locked-out users from accessing the app");
  });

  test("locked out user sees expected error @smoke @auth", async ({ page }) => {
    addScenario("Verifies that a locked-out user sees a clear error message on login");

    addBehaviour("Locked-out user submits credentials on the login page");
    await login(page, USERS.lockedOut);

    addBehaviour("An error message is displayed explaining the account is locked");
    await expect(page.getByTestId("error")).toContainText("Sorry, this user has been locked out");
  });
});

test.describe("AI Failure Analysis", () => {
  test.beforeEach(() => {
    addFeature("AI Failure Analysis", "As a developer I want failed tests to be analysed by AI");
  });

  test("intentional failure for AI analysis demo @regression", async ({ page }) => {
    addScenario("Demonstrates AI analysis on an intentionally failing assertion");

    addBehaviour("Standard user logs in successfully");
    await login(page, USERS.standard);

    addBehaviour("Page contains a heading that does not exist — assertion fails intentionally");
    await expect(page.getByRole("heading", { name: "Non Existing Header" })).toBeVisible();
  });
});
