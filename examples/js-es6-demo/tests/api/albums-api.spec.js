// @ts-check
import { test, expect } from "@playwright/test";
import { addFeature, addScenario, addBehaviour, addApiRequest, addApiResponse } from "../../annotations.mjs";

test.describe("Albums API", () => {
  test.beforeEach(() => {
    addFeature("Albums API", "As a developer I want to validate the JSONPlaceholder albums endpoints");
  });

  const USER_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  for (const userId of USER_IDS) {
    test(`GET /users/${userId}/albums returns albums for user`, async ({ request, baseURL }) => {
      addScenario(`Verifies albums sub-resource returns items for user #${userId}`);

      addBehaviour(`Client sends GET /users/${userId}/albums`);
      addApiRequest("GET", `${baseURL}/users/${userId}/albums`);
      const res = await request.get(`${baseURL}/users/${userId}/albums`);
      const body = await res.json();
      addApiResponse(res.status(), body.slice(0, 2));

      addBehaviour("Response is 200 and albums belong to the correct user");
      expect(res.status()).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body.every((a) => a.userId === userId)).toBe(true);
    });
  }

  test("GET /albums returns 100 albums", async ({ request, baseURL }) => {
    addScenario("Verifies the albums collection endpoint returns all 100 albums");

    addBehaviour("Client sends GET /albums");
    addApiRequest("GET", `${baseURL}/albums`);
    const res = await request.get(`${baseURL}/albums`);
    const body = await res.json();
    addApiResponse(res.status(), body.slice(0, 2));

    addBehaviour("Response is 200 with exactly 100 albums");
    expect(res.status()).toBe(200);
    expect(body).toHaveLength(100);
  });

  test("GET /albums/1/photos returns photos for album", async ({ request, baseURL }) => {
    addScenario("Verifies photos sub-resource returns items for album 1");

    addBehaviour("Client sends GET /albums/1/photos");
    addApiRequest("GET", `${baseURL}/albums/1/photos`);
    const res = await request.get(`${baseURL}/albums/1/photos`);
    const body = await res.json();
    addApiResponse(res.status(), body.slice(0, 2));

    addBehaviour("Response is 200 and photos belong to album 1");
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.every((p) => p.albumId === 1)).toBe(true);
    expect(body[0]).toHaveProperty("url");
    expect(body[0]).toHaveProperty("thumbnailUrl");
  });

  test("POST /albums creates a new album", async ({ request, baseURL }) => {
    addScenario("Verifies a new album can be created via POST");

    const payload = { title: "My Test Album", userId: 1 };

    addBehaviour("Client sends POST /albums with title and userId");
    addApiRequest("POST", `${baseURL}/albums`, payload);
    const res = await request.post(`${baseURL}/albums`, { data: payload });
    const body = await res.json();
    addApiResponse(res.status(), body);

    addBehaviour("Response is 201 with the new album and an id");
    expect(res.status()).toBe(201);
    expect(body).toMatchObject(payload);
    expect(body.id).toBeDefined();
  });
});
