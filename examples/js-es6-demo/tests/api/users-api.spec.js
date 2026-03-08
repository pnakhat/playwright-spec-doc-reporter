// @ts-check
import { test, expect } from "@playwright/test";
import { addFeature, addScenario, addBehaviour, addApiRequest, addApiResponse } from "../../annotations.mjs";

test.describe("Users API", () => {
  test.beforeEach(() => {
    addFeature(
      "Users API",
      "As a developer I want to validate the JSONPlaceholder users endpoints"
    );
  });

  test("GET /users returns a list of users", async ({ request, baseURL }) => {
    addScenario("Verifies the users collection endpoint returns 10 users");

    addBehaviour("Client sends GET request to /users");
    addApiRequest("GET", `${baseURL}/users`);
    const res = await request.get(`${baseURL}/users`);
    const body = await res.json();
    addApiResponse(res.status(), body.slice(0, 2)); // show first 2 for brevity

    addBehaviour("Response is 200 with 10 user objects");
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(10);
    expect(body[0]).toHaveProperty("name");
    expect(body[0]).toHaveProperty("email");
  });

  test("GET /users/:id returns a single user", async ({ request, baseURL }) => {
    addScenario("Verifies a user can be fetched by ID with full profile data");

    addBehaviour("Client sends GET request to /users/1");
    addApiRequest("GET", `${baseURL}/users/1`);
    const res = await request.get(`${baseURL}/users/1`);
    const body = await res.json();
    addApiResponse(res.status(), body);

    addBehaviour("Response is 200 with user profile including address and company");
    expect(res.status()).toBe(200);
    expect(body.id).toBe(1);
    expect(body).toHaveProperty("address");
    expect(body).toHaveProperty("company");
    expect(body.email).toMatch(/@/);
  });

  test("GET /users/:id/posts returns user's posts", async ({ request, baseURL }) => {
    addScenario("Verifies the user sub-resource posts endpoint returns related posts");

    addBehaviour("Client sends GET request to /users/1/posts");
    addApiRequest("GET", `${baseURL}/users/1/posts`);
    const res = await request.get(`${baseURL}/users/1/posts`);
    const body = await res.json();
    addApiResponse(res.status(), body.slice(0, 2));

    addBehaviour("Response is 200 with posts belonging to user 1");
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((p) => p.userId === 1)).toBe(true);
  });
});
