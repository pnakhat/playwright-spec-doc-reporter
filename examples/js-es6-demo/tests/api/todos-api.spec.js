// @ts-check
import { test, expect } from "@playwright/test";
import { addFeature, addScenario, addBehaviour, addApiRequest, addApiResponse } from "../../annotations.mjs";

test.describe("Todos API", () => {
  test.beforeEach(() => {
    addFeature("Todos API", "As a developer I want to validate the JSONPlaceholder todos endpoints");
  });

  const TODO_IDS = [1, 5, 10, 25, 50, 75, 100, 150, 180, 200];

  for (const id of TODO_IDS) {
    test(`GET /todos/${id} returns correct todo`, async ({ request, baseURL }) => {
      addScenario(`Verifies todo #${id} can be fetched and has required fields`);

      addBehaviour(`Client sends GET /todos/${id}`);
      addApiRequest("GET", `${baseURL}/todos/${id}`);
      const res = await request.get(`${baseURL}/todos/${id}`);
      const body = await res.json();
      addApiResponse(res.status(), body);

      addBehaviour("Response is 200 with a valid todo object");
      expect(res.status()).toBe(200);
      expect(body.id).toBe(id);
      expect(body).toHaveProperty("title");
      expect(body).toHaveProperty("completed");
      expect(typeof body.userId).toBe("number");
    });
  }

  test("GET /todos returns 200 todos", async ({ request, baseURL }) => {
    addScenario("Verifies the todos collection returns the full 200 items");

    addBehaviour("Client sends GET /todos");
    addApiRequest("GET", `${baseURL}/todos`);
    const res = await request.get(`${baseURL}/todos`);
    const body = await res.json();
    addApiResponse(res.status(), body.slice(0, 3));

    addBehaviour("Response is 200 with exactly 200 todos");
    expect(res.status()).toBe(200);
    expect(body).toHaveLength(200);
  });

  test("GET /todos?completed=true returns only completed todos", async ({ request, baseURL }) => {
    addScenario("Verifies filtering by completed=true works");

    addBehaviour("Client sends GET /todos?completed=true");
    addApiRequest("GET", `${baseURL}/todos?completed=true`);
    const res = await request.get(`${baseURL}/todos?completed=true`);
    const body = await res.json();
    addApiResponse(res.status(), body.slice(0, 2));

    addBehaviour("All returned todos have completed=true");
    expect(res.status()).toBe(200);
    expect(body.every((t) => t.completed === true)).toBe(true);
  });

  test("GET /todos?userId=1 returns todos for user 1", async ({ request, baseURL }) => {
    addScenario("Verifies filtering by userId returns the right subset");

    addBehaviour("Client sends GET /todos?userId=1");
    addApiRequest("GET", `${baseURL}/todos?userId=1`);
    const res = await request.get(`${baseURL}/todos?userId=1`);
    const body = await res.json();
    addApiResponse(res.status(), body.slice(0, 2));

    addBehaviour("All returned todos belong to user 1");
    expect(res.status()).toBe(200);
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((t) => t.userId === 1)).toBe(true);
  });

  test("POST /todos creates a new todo", async ({ request, baseURL }) => {
    addScenario("Verifies a new todo can be created");

    const payload = { title: "Write more tests", completed: false, userId: 1 };

    addBehaviour("Client sends POST /todos with payload");
    addApiRequest("POST", `${baseURL}/todos`, payload);
    const res = await request.post(`${baseURL}/todos`, { data: payload });
    const body = await res.json();
    addApiResponse(res.status(), body);

    addBehaviour("Response is 201 with the created todo");
    expect(res.status()).toBe(201);
    expect(body).toMatchObject(payload);
    expect(body.id).toBeDefined();
  });
});
