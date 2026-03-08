import { expect, test } from "@playwright/test";
import { addApiRequest, addApiResponse, addBehaviour, addFeature, addScenario } from "../../annotations.mjs";

test.describe("JSONPlaceholder API", () => {
  test.beforeEach(() => {
    addFeature("JSONPlaceholder API", "As a developer I want to validate the public REST API endpoints");
  });

  test("GET /posts returns array @smoke @api", async ({ request, baseURL }) => {
    addScenario("Verifies that the posts collection endpoint returns a non-empty array");

    addBehaviour("Client sends GET request to /posts");
    addApiRequest("GET", `${baseURL}/posts`);
    const response = await request.get(`${baseURL}/posts`);
    const body = (await response.json()) as Array<{ id: number; title: string }>;
    addApiResponse(response.status(), body.slice(0, 3)); // show first 3 for brevity

    addBehaviour("Response is a non-empty array of post objects");
    expect(response.ok()).toBeTruthy();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty("id");
    expect(body[0]).toHaveProperty("title");
  });

  test("GET /posts/1 has expected shape @regression @api", async ({ request, baseURL }) => {
    addScenario("Verifies that a single post has the correct fields");

    addBehaviour("Client sends GET request to /posts/1");
    addApiRequest("GET", `${baseURL}/posts/1`);
    const response = await request.get(`${baseURL}/posts/1`);
    const body = (await response.json()) as { userId: number; id: number; title: string; body: string };
    addApiResponse(response.status(), body);

    addBehaviour("Response contains id, title, and body fields");
    expect(response.status()).toBe(200);
    expect(body.id).toBe(1);
    expect(typeof body.title).toBe("string");
    expect(typeof body.body).toBe("string");
  });

  test("POST /posts can create resource @smoke @api @critical", async ({ request, baseURL }) => {
    addScenario("Verifies that a new post can be created via POST");

    const payload = {
      title: "glossy reporter",
      body: "api test sample",
      userId: 99
    };

    addBehaviour("Client sends POST request with new post data");
    addApiRequest("POST", `${baseURL}/posts`, payload);
    const response = await request.post(`${baseURL}/posts`, { data: payload });
    const body = (await response.json()) as { id: number; title: string; body: string; userId: number };
    addApiResponse(response.status(), body);

    addBehaviour("Response returns 201 with the created resource including a new id");
    expect(response.status()).toBe(201);
    expect(body).toMatchObject(payload);
    expect(typeof body.id).toBe("number");
  });
});
