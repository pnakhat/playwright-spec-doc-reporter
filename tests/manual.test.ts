import { describe, expect, it } from "vitest";
import { parseManualResults } from "../src/manual/parser.js";

const FILE = "tests/manual-results.md";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parse(md: string) {
  return parseManualResults(md, FILE);
}

// ---------------------------------------------------------------------------
// Status resolution
// ---------------------------------------------------------------------------

describe("status tags", () => {
  it("@PASS resolves to passed", () => {
    const [t] = parse("## Login works @PASS");
    expect(t.status).toBe("passed");
  });

  it("@FAIL resolves to failed", () => {
    const [t] = parse("## Login works @FAIL");
    expect(t.status).toBe("failed");
  });

  it("@SKIP resolves to skipped", () => {
    const [t] = parse("## Login works @SKIP");
    expect(t.status).toBe("skipped");
  });

  it("defaults to passed when no status tag present", () => {
    const [t] = parse("## Login works");
    expect(t.status).toBe("passed");
  });

  it("is case-insensitive for status tags", () => {
    const [t] = parse("## Login works @fail");
    expect(t.status).toBe("failed");
  });
});

// ---------------------------------------------------------------------------
// Title parsing
// ---------------------------------------------------------------------------

describe("title parsing", () => {
  it("strips @PASS from title", () => {
    const [t] = parse("## Login works @PASS");
    expect(t.title).toBe("Login works");
  });

  it("strips Scenario: prefix", () => {
    const [t] = parse("## Scenario: Login works @PASS");
    expect(t.title).toBe("Login works");
  });

  it("strips Scenario Outline: prefix", () => {
    const [t] = parse("## Scenario Outline: Login works @PASS");
    expect(t.title).toBe("Login works");
  });

  it("preserves other tags in title but strips them from title text", () => {
    const [t] = parse("## Login works @PASS @smoke @SCRUM-1");
    expect(t.title).toBe("Login works");
    expect(t.tags).toContain("@smoke");
    expect(t.tags).toContain("@SCRUM-1");
  });
});

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

describe("tags", () => {
  it("always injects @manual", () => {
    const [t] = parse("## A test @PASS");
    expect(t.tags).toContain("@manual");
  });

  it("does not include @PASS/@FAIL/@SKIP in output tags", () => {
    const [t] = parse("## A test @PASS @FAIL @SKIP");
    expect(t.tags).not.toContain("@PASS");
    expect(t.tags).not.toContain("@FAIL");
    expect(t.tags).not.toContain("@SKIP");
  });

  it("preserves Jira tags", () => {
    const [t] = parse("## A test @PASS @SCRUM-42");
    expect(t.tags).toContain("@SCRUM-42");
  });

  it("preserves arbitrary tags", () => {
    const [t] = parse("## A test @PASS @smoke @critical");
    expect(t.tags).toContain("@smoke");
    expect(t.tags).toContain("@critical");
  });

  it("deduplicates tags", () => {
    const [t] = parse("## A test @PASS @smoke @smoke");
    expect(t.tags.filter(x => x === "@smoke")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// source field
// ---------------------------------------------------------------------------

describe("source field", () => {
  it("sets source to manual", () => {
    const [t] = parse("## A test @PASS");
    expect(t.source).toBe("manual");
  });
});

// ---------------------------------------------------------------------------
// Feature grouping
// ---------------------------------------------------------------------------

describe("feature grouping", () => {
  it("sets featureMeta.name from # Feature: heading", () => {
    const md = `
# Feature: Login

## Standard user can login @PASS
`;
    const [t] = parse(md);
    expect(t.featureMeta?.name).toBe("Login");
  });

  it("groups suite by feature name", () => {
    const md = `
# Feature: Checkout

## Place order @PASS
`;
    const [t] = parse(md);
    expect(t.suite).toBe("Checkout");
  });

  it("defaults suite to 'Manual Tests' when no feature heading", () => {
    const [t] = parse("## A test @PASS");
    expect(t.suite).toBe("Manual Tests");
  });

  it("applies feature to all subsequent tests", () => {
    const md = `
# Feature: Cart

## Add item @PASS

## Remove item @FAIL
`;
    const tests = parse(md);
    expect(tests).toHaveLength(2);
    expect(tests[0].featureMeta?.name).toBe("Cart");
    expect(tests[1].featureMeta?.name).toBe("Cart");
  });
});

// ---------------------------------------------------------------------------
// Non-Gherkin body parsing
// ---------------------------------------------------------------------------

describe("non-Gherkin body", () => {
  it("parses Notes: line into scenarioDescription", () => {
    const md = `
## Login @PASS
Notes: Tested on Chrome 120
`;
    const [t] = parse(md);
    expect(t.scenarioDescription).toBe("Tested on Chrome 120");
  });

  it("parses Error: line into errorMessage on failed test", () => {
    const md = `
## Login @FAIL
Error: Button not found
`;
    const [t] = parse(md);
    expect(t.errorMessage).toBe("Button not found");
  });

  it("does not set errorMessage on passed test", () => {
    const md = `
## Login @PASS
Error: This should be ignored
`;
    const [t] = parse(md);
    expect(t.errorMessage).toBeUndefined();
  });

  it("produces empty steps array for non-Gherkin block", () => {
    const md = `
## Login @PASS
Notes: Quick check
`;
    const [t] = parse(md);
    expect(t.steps).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Gherkin body parsing
// ---------------------------------------------------------------------------

describe("Gherkin body", () => {
  const gherkinMd = `
## Scenario: Standard login @PASS
Given I am on the login page
When I enter valid credentials
Then I should see the dashboard
`;

  it("parses Given/When/Then into steps", () => {
    const [t] = parse(gherkinMd);
    expect(t.steps).toHaveLength(3);
    expect(t.steps[0].title).toBe("Given I am on the login page");
    expect(t.steps[1].title).toBe("When I enter valid credentials");
    expect(t.steps[2].title).toBe("Then I should see the dashboard");
  });

  it("sets step category to gherkin", () => {
    const [t] = parse(gherkinMd);
    expect(t.steps.every(s => s.category === "gherkin")).toBe(true);
  });

  it("all steps passed for passing test", () => {
    const [t] = parse(gherkinMd);
    expect(t.steps.every(s => s.status === "passed")).toBe(true);
  });

  it("marks last step as failed on a failed Gherkin test", () => {
    const md = `
## Scenario: Login fails @FAIL
Given I am on the login page
When I enter invalid credentials
Then I should see an error
Error: Error message not displayed
`;
    const [t] = parse(md);
    expect(t.steps[t.steps.length - 1].status).toBe("failed");
  });

  it("sets error on failing step", () => {
    const md = `
## Scenario: Login fails @FAIL
Given I am on the login page
Then I should see an error
Error: Error message not displayed
`;
    const [t] = parse(md);
    const failStep = t.steps[t.steps.length - 1];
    expect(failStep.error).toBe("Error message not displayed");
  });

  it("supports And/But keywords", () => {
    const md = `
## Scenario: Multi-step @PASS
Given I am logged in
And I have items in cart
But I am not on checkout
When I go to checkout
Then I see my cart
`;
    const [t] = parse(md);
    expect(t.steps).toHaveLength(5);
  });

  it("is case-insensitive for Gherkin keywords", () => {
    const md = `
## Scenario: Case test @PASS
GIVEN I am on the page
WHEN I click
THEN I see result
`;
    const [t] = parse(md);
    expect(t.steps).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Multiple tests
// ---------------------------------------------------------------------------

describe("multiple tests", () => {
  it("parses multiple ## blocks", () => {
    const md = `
## Test A @PASS

## Test B @FAIL

## Test C @SKIP
`;
    const tests = parse(md);
    expect(tests).toHaveLength(3);
    expect(tests[0].status).toBe("passed");
    expect(tests[1].status).toBe("failed");
    expect(tests[2].status).toBe("skipped");
  });

  it("generates unique deterministic ids per test", () => {
    const md = `
## Test A @PASS
## Test B @PASS
`;
    const tests = parse(md);
    expect(tests[0].id).not.toBe(tests[1].id);
  });

  it("returns same id for same file+title across runs", () => {
    const md = "## Test A @PASS";
    const r1 = parseManualResults(md, FILE);
    const r2 = parseManualResults(md, FILE);
    expect(r1[0].id).toBe(r2[0].id);
  });

  it("returns empty array for empty file", () => {
    expect(parse("")).toHaveLength(0);
  });

  it("returns empty array for file with only feature headings", () => {
    expect(parse("# Feature: Login")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Mixed Gherkin + non-Gherkin in same file
// ---------------------------------------------------------------------------

describe("mixed formats in one file", () => {
  it("handles Gherkin and non-Gherkin blocks coexisting", () => {
    const md = `
# Feature: Login

## Standard login @PASS
Notes: Tested manually on prod

## Scenario: Failed login @FAIL
Given I am on the login page
When I enter wrong password
Then I see an error
Error: No error shown
`;
    const tests = parse(md);
    expect(tests).toHaveLength(2);
    expect(tests[0].steps).toHaveLength(0);   // non-Gherkin
    expect(tests[1].steps).toHaveLength(3);   // Gherkin
    expect(tests[1].steps[2].status).toBe("failed");
  });
});
