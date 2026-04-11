import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";

Given("I open the todo app", async function () {
  await this.page.goto(this.todoAppUrl);
  await expect(this.page.locator(".new-todo")).toBeVisible();
});

When("I type {string} in the todo input", async function (text) {
  await this.page.fill(".new-todo", text);
});

When("I press Enter", async function () {
  await this.page.press(".new-todo", "Enter");
});

Then("I should see {string} in the list", async function (text) {
  await expect(this.page.locator(".todo-list li").filter({ hasText: text })).toBeVisible();
});

Then("the active count should be {string}", async function (count) {
  await expect(this.page.locator(".todo-count")).toContainText(count);
});

Given("I have added the todo {string}", async function (text) {
  await this.page.fill(".new-todo", text);
  await this.page.press(".new-todo", "Enter");
});

When("I click the checkbox next to {string}", async function (text) {
  const item = this.page.locator(".todo-list li").filter({ hasText: text });
  await item.locator(".toggle").click();
});

Then("{string} should be marked as completed", async function (text) {
  const item = this.page.locator(".todo-list li").filter({ hasText: text });
  await expect(item).toHaveClass(/completed/);
});

When("I hover over {string}", async function (text) {
  const item = this.page.locator(".todo-list li").filter({ hasText: text });
  await item.hover();
});

When("I click the delete button", async function () {
  await this.page.locator(".destroy:visible").first().click();
});

Then("{string} should not be in the list", async function (text) {
  await expect(this.page.locator(".todo-list li").filter({ hasText: text })).not.toBeVisible();
});

Given("I have completed {string}", async function (text) {
  const item = this.page.locator(".todo-list li").filter({ hasText: text });
  await item.locator(".toggle").click();
});

When("I click the {string} filter", async function (filter) {
  await this.page.getByRole("link", { name: filter }).click();
});

Then("I should not see {string} in the list", async function (text) {
  await expect(this.page.locator(".todo-list li").filter({ hasText: text })).not.toBeVisible();
});
