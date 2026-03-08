// @ts-check
import { test, expect } from "@playwright/test";
import { addFeature, addScenario, addBehaviour, addApiRequest, addApiResponse } from "../../annotations.mjs";

test.describe("Posts API", () => {
  test.beforeEach(() => {
    addFeature(
      "Posts API",
      "As a developer I want to validate the JSONPlaceholder posts endpoints"
    );
  });

  test("GET /posts returns a list of posts", async ({ request, baseURL }) => {
    addScenario("Verifies the posts collection endpoint returns valid data");

    addBehaviour("Client sends GET request to /posts");
    addApiRequest("GET", `${baseURL}/posts`);
    const res = await request.get(`${baseURL}/posts`);
    const body = await res.json();
    addApiResponse(res.status(), body.slice(0, 3)); // show first 3 for brevity

    addBehaviour("Response is 200 with an array of 100 posts");
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(100);
    expect(body[0]).toMatchObject({ id: 1, userId: 1 });
  });

  test("GET /posts/:id returns a single post", async ({ request, baseURL }) => {
    addScenario("Verifies a specific post can be fetched by ID");

    addBehaviour("Client sends GET request to /posts/1");
    addApiRequest("GET", `${baseURL}/posts/1`);
    const res = await request.get(`${baseURL}/posts/1`);
    const body = await res.json();
    addApiResponse(res.status(), body);

    addBehaviour("Response is 200 with the post object");
    expect(res.status()).toBe(200);
    expect(body.id).toBe(1);
    expect(body).toHaveProperty("title");
    expect(body).toHaveProperty("body");
    expect(body).toHaveProperty("userId");
  });

  test("POST /posts creates a new resource", async ({ request, baseURL }) => {
    addScenario("Verifies a new post is created and returned with an id");

    const payload = {
      title: "Hello from JS ES6",
      body: "This is a test post created from a plain JavaScript spec",
      userId: 42
    };

    addBehaviour("Client sends POST request with post data");
    addApiRequest("POST", `${baseURL}/posts`, payload, { "Content-Type": "application/json" });
    const res = await request.post(`${baseURL}/posts`, { data: payload });
    const body = await res.json();
    addApiResponse(res.status(), body);

    addBehaviour("Response is 201 with the new resource including an id");
    expect(res.status()).toBe(201);
    expect(body).toMatchObject(payload);
    expect(body.id).toBeDefined();
  });

  test("PUT /posts/:id updates an existing resource", async ({ request, baseURL }) => {
    addScenario("Verifies a post can be fully updated via PUT");

    const update = {
      id: 1,
      title: "Updated Title",
      body: "Updated body content",
      userId: 1
    };

    addBehaviour("Client sends PUT request to /posts/1 with updated data");
    addApiRequest("PUT", `${baseURL}/posts/1`, update);
    const res = await request.put(`${baseURL}/posts/1`, { data: update });
    const body = await res.json();
    addApiResponse(res.status(), body);

    addBehaviour("Response is 200 with the updated resource");
    expect(res.status()).toBe(200);
    expect(body.title).toBe("Updated Title");
  });

  test("DELETE /posts/:id removes a resource", async ({ request, baseURL }) => {
    addScenario("Verifies a post can be deleted");

    addBehaviour("Client sends DELETE request to /posts/1");
    addApiRequest("DELETE", `${baseURL}/posts/1`);
    const res = await request.delete(`${baseURL}/posts/1`);
    addApiResponse(res.status(), {});

    addBehaviour("Response is 200 indicating successful deletion");
    expect(res.status()).toBe(200);
  });
});
