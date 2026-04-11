import { describe, expect, it, afterEach } from "vitest";
import { parseCucumberJsonReport } from "../src/cucumber/adapter.js";
import {
  isCucumberTest,
  extractCucumberMeta,
  parseGherkinStepTitle,
  gherkinStepCategory,
} from "../src/cucumber/cucumberDetector.js";
import {
  attachApiRequest,
  attachApiResponse,
  CUCUMBER_API_REQUEST_MIME,
  CUCUMBER_API_RESPONSE_MIME,
} from "../src/cucumber/cucumberAnnotations.js";
import type { CucumberFeature } from "../src/cucumber/types.js";
import type { TestCase } from "@playwright/test/reporter";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Cucumber JSON feature fixture */
function makeFeature(overrides: Partial<CucumberFeature> = {}): CucumberFeature {
  return {
    id: "login-feature",
    keyword: "Feature",
    name: "Login Feature",
    description: "",
    line: 1,
    uri: "features/login.feature",
    tags: [],
    elements: [],
    ...overrides,
  };
}

function makeScenario(name: string, steps: { keyword: string; name: string; status: string; durationNs?: number; error?: string }[], tags: string[] = []) {
  return {
    id: `login-feature;${name.toLowerCase().replace(/\s+/g, "-")}`,
    keyword: "Scenario",
    name,
    description: "",
    line: 3,
    type: "scenario",
    tags: tags.map(t => ({ name: t, line: 2 })),
    steps: steps.map((s, i) => ({
      keyword: s.keyword + " ",
      name: s.name,
      line: 4 + i,
      match: { location: "steps/login.steps.ts:5" },
      result: {
        status: s.status,
        duration: s.durationNs ?? 100_000_000,
        error_message: s.error,
      },
      arguments: [],
      embeddings: undefined,
    })),
  };
}

/** Build a minimal TestCase-like object for detector tests */
function makeTestCase(overrides: {
  title?: string;
  filePath?: string;
  annotations?: Array<{ type: string; description?: string }>;
  tags?: string[];
  parentTitle?: string;
} = {}): TestCase {
  const parent: Partial<TestCase["parent"]> = {
    title: overrides.parentTitle ?? "Suite",
    parent: undefined,
    project: () => undefined,
  } as unknown as TestCase["parent"];

  return {
    title: overrides.title ?? "some test",
    location: { file: overrides.filePath ?? "/project/tests/test.spec.ts", line: 1, column: 1 },
    annotations: overrides.annotations ?? [],
    tags: overrides.tags ?? [],
    parent,
    titlePath: () => [overrides.parentTitle ?? "Suite", overrides.title ?? "some test"],
    expectedStatus: "passed",
  } as unknown as TestCase;
}

// ---------------------------------------------------------------------------
// parseCucumberJsonReport — status mapping
// ---------------------------------------------------------------------------

describe("parseCucumberJsonReport — status mapping", () => {
  it("maps all-passed scenario to passed", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        elements: [
          makeScenario("Standard Login", [
            { keyword: "Given", name: "I am on the login page", status: "passed" },
            { keyword: "When", name: "I enter valid credentials", status: "passed" },
            { keyword: "Then", name: "I see the dashboard", status: "passed" },
          ]),
        ],
      }),
    ];
    const tmp = writeTmp(json);
    const results = parseCucumberJsonReport(tmp);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("passed");
  });

  it("maps scenario with a failed step to failed", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        elements: [
          makeScenario("Bad Login", [
            { keyword: "Given", name: "I am on the login page", status: "passed" },
            { keyword: "When", name: "I enter wrong credentials", status: "passed" },
            { keyword: "Then", name: "I see an error", status: "failed", error: "Expected error text" },
          ]),
        ],
      }),
    ];
    const tmp = writeTmp(json);
    const results = parseCucumberJsonReport(tmp);
    expect(results[0].status).toBe("failed");
    expect(results[0].errorMessage).toBe("Expected error text");
  });

  it("maps scenario with all-skipped steps to skipped", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        elements: [
          makeScenario("Skipped Login", [
            { keyword: "Given", name: "I am on the login page", status: "skipped" },
            { keyword: "When", name: "I enter credentials", status: "skipped" },
          ]),
        ],
      }),
    ];
    const tmp = writeTmp(json);
    const results = parseCucumberJsonReport(tmp);
    expect(results[0].status).toBe("skipped");
  });

  it("maps pending step to skipped", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        elements: [
          makeScenario("Pending", [
            { keyword: "Given", name: "something not implemented", status: "pending" },
          ]),
        ],
      }),
    ];
    const tmp = writeTmp(json);
    const [r] = parseCucumberJsonReport(tmp);
    expect(r.status).toBe("skipped");
  });

  it("maps undefined step to skipped", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        elements: [
          makeScenario("Undefined step", [
            { keyword: "Given", name: "a step with no definition", status: "undefined" },
          ]),
        ],
      }),
    ];
    const tmp = writeTmp(json);
    const [r] = parseCucumberJsonReport(tmp);
    expect(r.status).toBe("skipped");
  });
});

// ---------------------------------------------------------------------------
// parseCucumberJsonReport — metadata
// ---------------------------------------------------------------------------

describe("parseCucumberJsonReport — metadata", () => {
  it("maps feature name to featureMeta.name and suite", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        name: "User Authentication",
        elements: [makeScenario("Login", [{ keyword: "Given", name: "step", status: "passed" }])],
      }),
    ];
    const [r] = parseCucumberJsonReport(writeTmp(json));
    expect(r.featureMeta?.name).toBe("User Authentication");
    expect(r.suite).toBe("User Authentication");
  });

  it("maps scenario name to title and scenarioDescription", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        elements: [makeScenario("Standard login flow", [{ keyword: "Given", name: "step", status: "passed" }])],
      }),
    ];
    const [r] = parseCucumberJsonReport(writeTmp(json));
    expect(r.title).toBe("Standard login flow");
    expect(r.scenarioDescription).toBe("Standard login flow");
  });

  it("builds fullName as Feature > Scenario", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        name: "Auth",
        elements: [makeScenario("Login", [{ keyword: "When", name: "step", status: "passed" }])],
      }),
    ];
    const [r] = parseCucumberJsonReport(writeTmp(json));
    expect(r.fullName).toBe("Auth > Login");
  });

  it("includes @cucumber tag on every result", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        elements: [makeScenario("test", [{ keyword: "Given", name: "step", status: "passed" }])],
      }),
    ];
    const [r] = parseCucumberJsonReport(writeTmp(json));
    expect(r.tags).toContain("@cucumber");
  });

  it("merges scenario and feature tags", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        tags: [{ name: "@smoke" }],
        elements: [
          makeScenario("test", [{ keyword: "Given", name: "step", status: "passed" }], ["@auth"]),
        ],
      }),
    ];
    const [r] = parseCucumberJsonReport(writeTmp(json));
    expect(r.tags).toContain("@smoke");
    expect(r.tags).toContain("@auth");
  });

  it("preserves Jira issue-key tags (e.g. @PROJ-42) for Jira integration", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        tags: [{ name: "@PROJ-10" }],
        elements: [
          makeScenario(
            "Login test",
            [{ keyword: "Given", name: "step", status: "passed" }],
            ["@PROJ-42"]
          ),
        ],
      }),
    ];
    const [r] = parseCucumberJsonReport(writeTmp(json));
    // Both feature-level and scenario-level Jira keys should be present
    expect(r.tags).toContain("@PROJ-10");
    expect(r.tags).toContain("@PROJ-42");
    // Tags should match the Jira issue-key regex used in jira/index.ts
    const ISSUE_KEY_RE = /^@?([A-Z][A-Z0-9]+-\d+)$/;
    const jiraKeys = r.tags.flatMap(t => {
      const m = t.match(ISSUE_KEY_RE);
      return m ? [m[1]] : [];
    });
    expect(jiraKeys).toContain("PROJ-10");
    expect(jiraKeys).toContain("PROJ-42");
  });

  it("sets behaviours from step keyword+text pairs", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        elements: [
          makeScenario("Login", [
            { keyword: "Given", name: "I am on the login page", status: "passed" },
            { keyword: "When", name: "I enter credentials", status: "passed" },
            { keyword: "Then", name: "I see the dashboard", status: "passed" },
          ]),
        ],
      }),
    ];
    const [r] = parseCucumberJsonReport(writeTmp(json));
    expect(r.behaviours).toEqual([
      "Given I am on the login page",
      "When I enter credentials",
      "Then I see the dashboard",
    ]);
  });

  it("uses feature uri as file", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        uri: "features/auth/login.feature",
        elements: [makeScenario("test", [{ keyword: "Given", name: "step", status: "passed" }])],
      }),
    ];
    const [r] = parseCucumberJsonReport(writeTmp(json));
    expect(r.file).toBe("features/auth/login.feature");
  });

  it("sums step durations into durationMs (nanoseconds → ms)", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        elements: [
          makeScenario("Login", [
            { keyword: "Given", name: "step 1", status: "passed", durationNs: 500_000_000 },  // 500ms
            { keyword: "When", name: "step 2", status: "passed", durationNs: 300_000_000 },   // 300ms
          ]),
        ],
      }),
    ];
    const [r] = parseCucumberJsonReport(writeTmp(json));
    expect(r.durationMs).toBe(800);
  });

  it("skips Background elements", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        elements: [
          {
            ...makeScenario("Background setup", [{ keyword: "Given", name: "setup step", status: "passed" }]),
            type: "background",
            keyword: "Background",
          },
          makeScenario("Real scenario", [{ keyword: "Given", name: "step", status: "passed" }]),
        ],
      }),
    ];
    const results = parseCucumberJsonReport(writeTmp(json));
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Real scenario");
  });

  it("produces stable IDs — same feature+scenario always gives same ID", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        elements: [makeScenario("Login", [{ keyword: "Given", name: "step", status: "passed" }])],
      }),
    ];
    const [r1] = parseCucumberJsonReport(writeTmp(json));
    const [r2] = parseCucumberJsonReport(writeTmp(json));
    expect(r1.id).toBe(r2.id);
  });

  it("assigns Gherkin keyword categories to steps", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        elements: [
          makeScenario("Login", [
            { keyword: "Given", name: "setup", status: "passed" },
            { keyword: "When", name: "action", status: "passed" },
            { keyword: "Then", name: "assertion", status: "passed" },
            { keyword: "And", name: "extra", status: "passed" },
          ]),
        ],
      }),
    ];
    const [r] = parseCucumberJsonReport(writeTmp(json));
    expect(r.steps[0].category).toBe("given");
    expect(r.steps[1].category).toBe("when");
    expect(r.steps[2].category).toBe("then");
    expect(r.steps[3].category).toBe("and");
  });
});

// ---------------------------------------------------------------------------
// parseCucumberJsonReport — multiple features
// ---------------------------------------------------------------------------

describe("parseCucumberJsonReport — multiple features", () => {
  it("returns one result per scenario across multiple features", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        name: "Feature A",
        elements: [
          makeScenario("Scenario 1", [{ keyword: "Given", name: "step", status: "passed" }]),
          makeScenario("Scenario 2", [{ keyword: "Given", name: "step", status: "failed" }]),
        ],
      }),
      makeFeature({ name: "Feature B", uri: "features/b.feature", elements: [makeScenario("Scenario 3", [{ keyword: "Given", name: "step", status: "passed" }])] }),
    ];
    const results = parseCucumberJsonReport(writeTmp(json));
    expect(results).toHaveLength(3);
  });

  it("throws when file does not exist", () => {
    expect(() => parseCucumberJsonReport("/nonexistent/path/cucumber.json")).toThrow(
      /Cucumber JSON report not found/
    );
  });

  it("throws when JSON is not an array", () => {
    const tmp = writeTmpRaw(JSON.stringify({ not: "an array" }));
    expect(() => parseCucumberJsonReport(tmp)).toThrow(/must be an array/);
  });

  it("throws when JSON is malformed", () => {
    const tmp = writeTmpRaw("{ invalid json }}}");
    expect(() => parseCucumberJsonReport(tmp)).toThrow(/Failed to parse/);
  });
});

// ---------------------------------------------------------------------------
// parseCucumberJsonReport — API entry extraction from embeddings
// ---------------------------------------------------------------------------

describe("parseCucumberJsonReport — API entries from embeddings", () => {
  it("extracts apiEntries from glossy:request and glossy:response embeddings", () => {
    const requestEntry = { kind: "request", method: "GET", url: "https://api.example.com/posts" };
    const responseEntry = { kind: "response", status: 200, body: [{ id: 1 }] };

    const scenario = makeScenario("API test", [
      { keyword: "When", name: "I call the API", status: "passed" },
    ]);
    // Attach embeddings to the step
    scenario.steps[0].embeddings = [
      { data: Buffer.from(JSON.stringify(requestEntry)).toString("base64"), mime_type: CUCUMBER_API_REQUEST_MIME },
      { data: Buffer.from(JSON.stringify(responseEntry)).toString("base64"), mime_type: CUCUMBER_API_RESPONSE_MIME },
    ] as unknown as typeof scenario.steps[0]["embeddings"];

    const json: CucumberFeature[] = [makeFeature({ elements: [scenario] })];
    const [r] = parseCucumberJsonReport(writeTmp(json));

    expect(r.apiEntries).toHaveLength(2);
    expect(r.apiEntries![0]).toMatchObject({ kind: "request", method: "GET", url: "https://api.example.com/posts" });
    expect(r.apiEntries![1]).toMatchObject({ kind: "response", status: 200 });
  });

  it("returns undefined apiEntries when no API embeddings present", () => {
    const json: CucumberFeature[] = [
      makeFeature({
        elements: [makeScenario("no api", [{ keyword: "Given", name: "step", status: "passed" }])],
      }),
    ];
    const [r] = parseCucumberJsonReport(writeTmp(json));
    expect(r.apiEntries).toBeUndefined();
  });

  it("ignores non-API embeddings silently", () => {
    const scenario = makeScenario("with screenshot", [
      { keyword: "Given", name: "step", status: "passed" },
    ]);
    scenario.steps[0].embeddings = [
      { data: Buffer.from("fake png data").toString("base64"), mime_type: "image/png" },
    ] as unknown as typeof scenario.steps[0]["embeddings"];

    const json: CucumberFeature[] = [makeFeature({ elements: [scenario] })];
    const [r] = parseCucumberJsonReport(writeTmp(json));
    expect(r.apiEntries).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// isCucumberTest — detection
// ---------------------------------------------------------------------------

describe("isCucumberTest — detection", () => {
  it("detects test in .features-gen/ directory", () => {
    const tc = makeTestCase({ filePath: "/project/.features-gen/features/login.feature.spec.js" });
    expect(isCucumberTest(tc)).toBe(true);
  });

  it("detects test in features-gen/ (without leading dot)", () => {
    const tc = makeTestCase({ filePath: "/project/features-gen/features/login.feature.spec.js" });
    expect(isCucumberTest(tc)).toBe(true);
  });

  it("detects test file named *.feature.spec.ts", () => {
    const tc = makeTestCase({ filePath: "/project/tests/login.feature.spec.ts" });
    expect(isCucumberTest(tc)).toBe(true);
  });

  it("detects test via 'feature' annotation", () => {
    const tc = makeTestCase({ annotations: [{ type: "feature", description: "Login Feature" }] });
    expect(isCucumberTest(tc)).toBe(true);
  });

  it("detects test via 'scenario' annotation", () => {
    const tc = makeTestCase({ annotations: [{ type: "scenario", description: "Standard login" }] });
    expect(isCucumberTest(tc)).toBe(true);
  });

  it("detects test via @cucumber tag", () => {
    const tc = makeTestCase({ tags: ["@cucumber"] });
    expect(isCucumberTest(tc)).toBe(true);
  });

  it("detects test via @bdd tag", () => {
    const tc = makeTestCase({ tags: ["@bdd"] });
    expect(isCucumberTest(tc)).toBe(true);
  });

  it("detects test via 'Feature: …' parent suite title", () => {
    const tc = makeTestCase({ parentTitle: "Feature: User Authentication" });
    expect(isCucumberTest(tc)).toBe(true);
  });

  it("detects test via 'Feature: … > …' title pattern", () => {
    const tc = makeTestCase({ title: "Feature: Login > Standard login" });
    expect(isCucumberTest(tc)).toBe(true);
  });

  it("does NOT detect plain test with '>' separator as Cucumber", () => {
    const tc = makeTestCase({ title: "Login Feature > Standard login" });
    expect(isCucumberTest(tc)).toBe(false);
  });

  it("returns false for a plain Playwright test", () => {
    const tc = makeTestCase({
      title: "homepage loads",
      filePath: "/project/tests/homepage.spec.ts",
      parentTitle: "Smoke tests",
    });
    expect(isCucumberTest(tc)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractCucumberMeta — metadata extraction
// ---------------------------------------------------------------------------

describe("extractCucumberMeta", () => {
  it("returns isCucumber: false for non-cucumber test", () => {
    const tc = makeTestCase({ title: "plain test", filePath: "/project/tests/plain.spec.ts" });
    const meta = extractCucumberMeta(tc);
    expect(meta.isCucumber).toBe(false);
  });

  it("extracts featureName from annotation", () => {
    const tc = makeTestCase({
      annotations: [{ type: "feature", description: "Shopping Cart" }],
      filePath: "/project/.features-gen/cart.feature.spec.js",
    });
    const meta = extractCucumberMeta(tc);
    expect(meta.featureName).toBe("Shopping Cart");
  });

  it("extracts featureDescription from feature.description annotation", () => {
    const tc = makeTestCase({
      annotations: [
        { type: "feature", description: "Cart" },
        { type: "feature.description", description: "Manages shopping cart items" },
      ],
      filePath: "/project/.features-gen/cart.feature.spec.js",
    });
    const meta = extractCucumberMeta(tc);
    expect(meta.featureDescription).toBe("Manages shopping cart items");
  });

  it("extracts scenarioName from annotation", () => {
    const tc = makeTestCase({
      annotations: [
        { type: "feature", description: "Auth" },
        { type: "scenario", description: "User logs in with valid credentials" },
      ],
      filePath: "/project/.features-gen/auth.feature.spec.js",
    });
    const meta = extractCucumberMeta(tc);
    expect(meta.scenarioName).toBe("User logs in with valid credentials");
  });

  it("falls back to test.title when no scenario annotation", () => {
    const tc = makeTestCase({
      title: "Standard login flow",
      filePath: "/project/.features-gen/login.feature.spec.js",
    });
    const meta = extractCucumberMeta(tc);
    expect(meta.scenarioName).toBe("Standard login flow");
  });

  it("falls back to parent title when no feature annotation", () => {
    const tc = makeTestCase({
      title: "Standard login",
      parentTitle: "User Authentication",
      filePath: "/project/.features-gen/login.feature.spec.js",
    });
    const meta = extractCucumberMeta(tc);
    expect(meta.featureName).toBe("User Authentication");
  });

  it("always includes @cucumber in tags", () => {
    const tc = makeTestCase({ filePath: "/project/.features-gen/login.feature.spec.js" });
    const meta = extractCucumberMeta(tc);
    expect(meta.tags).toContain("@cucumber");
  });

  it("collects tags from test.tags array", () => {
    const tc = makeTestCase({
      filePath: "/project/.features-gen/login.feature.spec.js",
      tags: ["@smoke", "@auth"],
    });
    const meta = extractCucumberMeta(tc);
    expect(meta.tags).toContain("@smoke");
    expect(meta.tags).toContain("@auth");
  });

  it("normalises tags without @ prefix", () => {
    const tc = makeTestCase({
      filePath: "/project/.features-gen/login.feature.spec.js",
      tags: ["smoke"],
    });
    const meta = extractCucumberMeta(tc);
    expect(meta.tags).toContain("@smoke");
  });

  it("extracts ruleName from rule annotation", () => {
    const tc = makeTestCase({
      annotations: [
        { type: "feature", description: "Auth" },
        { type: "rule", description: "Standard users" },
      ],
      filePath: "/project/.features-gen/auth.feature.spec.js",
    });
    const meta = extractCucumberMeta(tc);
    expect(meta.ruleName).toBe("Standard users");
  });
});

// ---------------------------------------------------------------------------
// parseGherkinStepTitle
// ---------------------------------------------------------------------------

describe("parseGherkinStepTitle", () => {
  it("parses 'Given' keyword", () => {
    const r = parseGherkinStepTitle("Given I am on the login page");
    expect(r.keyword).toBe("Given");
    expect(r.text).toBe("I am on the login page");
  });

  it("parses 'When' keyword", () => {
    const r = parseGherkinStepTitle("When I enter my credentials");
    expect(r.keyword).toBe("When");
    expect(r.text).toBe("I enter my credentials");
  });

  it("parses 'Then' keyword", () => {
    const r = parseGherkinStepTitle("Then I should see the dashboard");
    expect(r.keyword).toBe("Then");
    expect(r.text).toBe("I should see the dashboard");
  });

  it("parses 'And' keyword", () => {
    const r = parseGherkinStepTitle("And the title should be Products");
    expect(r.keyword).toBe("And");
    expect(r.text).toBe("the title should be Products");
  });

  it("parses 'But' keyword", () => {
    const r = parseGherkinStepTitle("But I should not see an error");
    expect(r.keyword).toBe("But");
    expect(r.text).toBe("I should not see an error");
  });

  it("is case-insensitive", () => {
    const r = parseGherkinStepTitle("given I am on the page");
    expect(r.keyword).toBe("given");
  });

  it("returns null keyword for non-gherkin title", () => {
    const r = parseGherkinStepTitle("navigate to /login");
    expect(r.keyword).toBeNull();
    expect(r.text).toBe("navigate to /login");
  });
});

// ---------------------------------------------------------------------------
// gherkinStepCategory
// ---------------------------------------------------------------------------

describe("gherkinStepCategory", () => {
  it("maps Given → given", () => expect(gherkinStepCategory("Given")).toBe("given"));
  it("maps When → when", () => expect(gherkinStepCategory("When")).toBe("when"));
  it("maps Then → then", () => expect(gherkinStepCategory("Then")).toBe("then"));
  it("maps And → and", () => expect(gherkinStepCategory("And")).toBe("and"));
  it("maps But → and", () => expect(gherkinStepCategory("But")).toBe("and"));
  it("maps null → test", () => expect(gherkinStepCategory(null)).toBe("test"));
  it("maps unknown keyword → test", () => expect(gherkinStepCategory("Step")).toBe("test"));
  it("is case-insensitive", () => expect(gherkinStepCategory("GIVEN")).toBe("given"));
});

// ---------------------------------------------------------------------------
// attachApiRequest / attachApiResponse (Cucumber world helpers)
// ---------------------------------------------------------------------------

describe("attachApiRequest / attachApiResponse", () => {
  it("calls world.attach with correct MIME type for request", () => {
    const attachments: Array<{ data: string; mimeType: string }> = [];
    const world = {
      attach(data: string, mimeType: string) {
        attachments.push({ data, mimeType });
      },
    };

    attachApiRequest(world, "GET", "https://api.example.com/users");

    expect(attachments).toHaveLength(1);
    expect(attachments[0].mimeType).toBe(CUCUMBER_API_REQUEST_MIME);
    const parsed = JSON.parse(attachments[0].data);
    expect(parsed.kind).toBe("request");
    expect(parsed.method).toBe("GET");
    expect(parsed.url).toBe("https://api.example.com/users");
  });

  it("uppercases the HTTP method", () => {
    const attachments: Array<{ data: string; mimeType: string }> = [];
    const world = { attach(data: string, mimeType: string) { attachments.push({ data, mimeType }); } };
    attachApiRequest(world, "post", "https://api.example.com/posts", { title: "test" });
    const parsed = JSON.parse(attachments[0].data);
    expect(parsed.method).toBe("POST");
  });

  it("includes request body when provided", () => {
    const attachments: Array<{ data: string; mimeType: string }> = [];
    const world = { attach(data: string, mimeType: string) { attachments.push({ data, mimeType }); } };
    attachApiRequest(world, "POST", "https://api.example.com/posts", { title: "hello" });
    const parsed = JSON.parse(attachments[0].data);
    expect(parsed.body).toEqual({ title: "hello" });
  });

  it("calls world.attach with correct MIME type for response", () => {
    const attachments: Array<{ data: string; mimeType: string }> = [];
    const world = { attach(data: string, mimeType: string) { attachments.push({ data, mimeType }); } };

    attachApiResponse(world, 201, { id: 42 });

    expect(attachments).toHaveLength(1);
    expect(attachments[0].mimeType).toBe(CUCUMBER_API_RESPONSE_MIME);
    const parsed = JSON.parse(attachments[0].data);
    expect(parsed.kind).toBe("response");
    expect(parsed.status).toBe(201);
    expect(parsed.body).toEqual({ id: 42 });
  });

  it("includes response headers when provided", () => {
    const attachments: Array<{ data: string; mimeType: string }> = [];
    const world = { attach(data: string, mimeType: string) { attachments.push({ data, mimeType }); } };
    attachApiResponse(world, 200, null, { "Content-Type": "application/json" });
    const parsed = JSON.parse(attachments[0].data);
    expect(parsed.headers).toEqual({ "Content-Type": "application/json" });
  });

  it("works with an async attach function", async () => {
    const attachments: Array<{ data: string; mimeType: string }> = [];
    const world = {
      async attach(data: string, mimeType: string) {
        attachments.push({ data, mimeType });
      },
    };
    attachApiRequest(world, "GET", "https://example.com");
    expect(attachments).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Helpers for writing temp files
// ---------------------------------------------------------------------------

const tmpFiles: string[] = [];

afterEach(() => {
  for (const f of tmpFiles) {
    try { fs.rmSync(f); } catch { /* already gone */ }
  }
  tmpFiles.length = 0;
});

function writeTmp(json: unknown): string {
  return writeTmpRaw(JSON.stringify(json));
}

function writeTmpRaw(content: string): string {
  const tmp = path.join(os.tmpdir(), `cucumber-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(tmp, content, "utf-8");
  tmpFiles.push(tmp);
  return tmp;
}
