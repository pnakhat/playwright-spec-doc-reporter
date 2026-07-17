import { expect } from "@playwright/test";
import { When, Then } from "./fixtures.js";

const BASE_URL = "https://jsonplaceholder.typicode.com";

type ApiWorld = {
  status: number;
  body: { title?: string } | undefined;
};

const lastResponse: ApiWorld = { status: 0, body: undefined };

When("I GET the post with id {int}", async ({ request, apiRequest, apiResponse }, id: number) => {
  const url = `${BASE_URL}/posts/${id}`;
  apiRequest("GET", url);
  const res = await request.get(url);
  lastResponse.status = res.status();
  lastResponse.body = res.ok() ? await res.json() : undefined;
  apiResponse(lastResponse.status, lastResponse.body);
});

Then("the response status is {int}", async ({}, expected: number) => {
  expect(lastResponse.status).toBe(expected);
});

Then("the post title is not empty", async () => {
  expect(lastResponse.body?.title).toBeTruthy();
});
