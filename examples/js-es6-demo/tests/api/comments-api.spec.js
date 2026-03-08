// @ts-check
import { test, expect } from "@playwright/test";
import { addFeature, addScenario, addBehaviour, addApiRequest, addApiResponse } from "../../annotations.mjs";

test.describe("Comments API", () => {
  test.beforeEach(() => {
    addFeature("Comments API", "As a developer I want to validate the JSONPlaceholder comments endpoints");
  });

  const POST_IDS = [1, 2, 3, 4, 5, 10, 15, 20, 30, 50];

  for (const postId of POST_IDS) {
    test(`GET /posts/${postId}/comments returns comments for post`, async ({ request, baseURL }) => {
      addScenario(`Verifies comments sub-resource returns items for post #${postId}`);

      addBehaviour(`Client sends GET /posts/${postId}/comments`);
      addApiRequest("GET", `${baseURL}/posts/${postId}/comments`);
      const res = await request.get(`${baseURL}/posts/${postId}/comments`);
      const body = await res.json();
      addApiResponse(res.status(), body.slice(0, 2));

      addBehaviour("Response is 200 and comments belong to the correct post");
      expect(res.status()).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body.every((c) => c.postId === postId)).toBe(true);
      expect(body[0]).toHaveProperty("email");
      expect(body[0]).toHaveProperty("body");
    });
  }

  test("GET /comments returns 500 comments", async ({ request, baseURL }) => {
    addScenario("Verifies the full comments collection is returned");

    addBehaviour("Client sends GET /comments");
    addApiRequest("GET", `${baseURL}/comments`);
    const res = await request.get(`${baseURL}/comments`);
    const body = await res.json();
    addApiResponse(res.status(), body.slice(0, 2));

    addBehaviour("Response is 200 with 500 comment objects");
    expect(res.status()).toBe(200);
    expect(body).toHaveLength(500);
  });

  test("GET /comments?postId=1 filters by post", async ({ request, baseURL }) => {
    addScenario("Verifies filtering comments by postId query param works");

    addBehaviour("Client sends GET /comments?postId=1");
    addApiRequest("GET", `${baseURL}/comments?postId=1`);
    const res = await request.get(`${baseURL}/comments?postId=1`);
    const body = await res.json();
    addApiResponse(res.status(), body);

    addBehaviour("All returned comments have postId=1");
    expect(res.status()).toBe(200);
    expect(body.every((c) => c.postId === 1)).toBe(true);
    expect(body).toHaveLength(5);
  });

  test("Each comment has a valid email format", async ({ request, baseURL }) => {
    addScenario("Verifies comment emails are valid RFC-style addresses");

    addBehaviour("Client fetches 10 comments");
    addApiRequest("GET", `${baseURL}/comments?_limit=10`);
    const res = await request.get(`${baseURL}/comments?_limit=10`);
    const body = await res.json();
    addApiResponse(res.status(), body);

    addBehaviour("All email fields match a basic email pattern");
    expect(res.status()).toBe(200);
    for (const comment of body) {
      expect(comment.email).toMatch(/@/);
    }
  });
});
