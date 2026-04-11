/**
 * Cucumber JSON report format types.
 * Compatible with @cucumber/cucumber JSON formatter output.
 */

export interface CucumberJsonReport extends Array<CucumberFeature> {}

export interface CucumberFeature {
  description?: string;
  elements: CucumberElement[];
  id: string;
  keyword: string;
  line: number;
  name: string;
  tags?: CucumberTag[];
  uri: string;
}

export interface CucumberElement {
  description?: string;
  id: string;
  keyword: string; // "Scenario" | "Scenario Outline" | "Background"
  line: number;
  name: string;
  steps: CucumberStep[];
  tags?: CucumberTag[];
  type: string; // "scenario" | "background"
  before?: CucumberHookStep[];
  after?: CucumberHookStep[];
}

export interface CucumberStep {
  arguments?: CucumberStepArgument[];
  keyword: string; // "Given " | "When " | "Then " | "And " | "But "
  line?: number;
  match?: { location: string };
  name: string;
  result: CucumberStepResult;
  embeddings?: CucumberEmbedding[];
}

export interface CucumberHookStep {
  match?: { location: string };
  result: CucumberStepResult;
  embeddings?: CucumberEmbedding[];
}

export interface CucumberStepResult {
  duration?: number; // nanoseconds
  error_message?: string;
  status: "passed" | "failed" | "skipped" | "pending" | "undefined" | "ambiguous";
}

export interface CucumberTag {
  line?: number;
  name: string; // "@tagname"
}

export interface CucumberStepArgument {
  content?: string; // docstring
  rows?: Array<{ cells: string[] }>; // data table
}

export interface CucumberEmbedding {
  data: string;
  mime_type: string;
  name?: string;
}

/**
 * Cucumber Messages format (Cucumber 8+).
 * Used by @cucumber/cucumber with --format message output.
 */
export interface CucumberMessage {
  testRunStarted?: { timestamp: CucumberTimestamp };
  testRunFinished?: { timestamp: CucumberTimestamp; success: boolean };
  gherkinDocument?: {
    uri?: string;
    feature?: CucumberGherkinFeature;
  };
  pickle?: CucumberPickle;
  testCase?: {
    id: string;
    pickleId: string;
    testSteps: CucumberTestStep[];
  };
  testCaseStarted?: {
    id: string;
    testCaseId: string;
    attempt: number;
    timestamp: CucumberTimestamp;
  };
  testCaseFinished?: {
    testCaseStartedId: string;
    timestamp: CucumberTimestamp;
    willBeRetried: boolean;
  };
  testStepStarted?: {
    testCaseStartedId: string;
    testStepId: string;
    timestamp: CucumberTimestamp;
  };
  testStepFinished?: {
    testCaseStartedId: string;
    testStepId: string;
    testStepResult: {
      duration: CucumberTimestamp;
      message?: string;
      status: string;
      exception?: { message: string; stackTrace?: string };
    };
    timestamp: CucumberTimestamp;
  };
  attachment?: {
    testCaseStartedId?: string;
    testStepId?: string;
    body: string;
    mediaType: string;
    fileName?: string;
    contentEncoding?: string;
  };
}

export interface CucumberTimestamp {
  seconds: number;
  nanos: number;
}

export interface CucumberGherkinFeature {
  name: string;
  description?: string;
  keyword: string;
  tags?: Array<{ name: string }>;
  children?: CucumberGherkinChild[];
}

export interface CucumberGherkinChild {
  scenario?: {
    name: string;
    description?: string;
    keyword: string;
    tags?: Array<{ name: string }>;
    steps?: Array<{ keyword: string; text: string }>;
  };
  background?: {
    name: string;
    steps?: Array<{ keyword: string; text: string }>;
  };
  rule?: {
    name: string;
    children?: CucumberGherkinChild[];
  };
}

export interface CucumberPickle {
  id: string;
  uri?: string;
  name: string;
  language?: string;
  tags?: Array<{ name: string; astNodeId?: string }>;
  steps?: Array<{ id: string; text: string; astNodeIds?: string[] }>;
  astNodeIds?: string[];
}

export interface CucumberTestStep {
  id: string;
  pickleStepId?: string;
  hookId?: string;
  stepDefinitionIds?: string[];
}

/**
 * Normalized representation of a Cucumber scenario used during adapter conversion.
 */
export interface NormalizedCucumberScenario {
  featureName: string;
  featureFile: string;
  featureTags: string[];
  scenarioName: string;
  scenarioTags: string[];
  steps: NormalizedCucumberStep[];
  status: "passed" | "failed" | "skipped" | "pending";
  durationMs: number;
  errorMessage?: string;
  errorStep?: string;
  retries?: number;
  startedAt?: string;
  finishedAt?: string;
}

export interface NormalizedCucumberStep {
  keyword: string; // "Given" | "When" | "Then" | "And" | "But"
  text: string;
  durationMs: number;
  status: "passed" | "failed" | "skipped" | "pending";
  errorMessage?: string;
  embeddings?: CucumberEmbedding[];
}
