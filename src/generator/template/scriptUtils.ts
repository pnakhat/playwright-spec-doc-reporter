export function getScriptUtils(): string {
  return `
  const reportNode = document.getElementById("report-data");
  const report = JSON.parse((reportNode && reportNode.textContent) || "{}");

  const historyNode = document.getElementById("history-data");
  const historyData = JSON.parse((historyNode && historyNode.textContent) || '{"runs":[]}');
  const historyRuns = Array.isArray(historyData.runs) ? historyData.runs : [];

  const tests = Array.isArray(report.tests) ? report.tests.slice() : [];
  const summary = report.summary || {};
  const aiEnabled = report.aiEnabled === true;
  const aiAnalyses = Array.isArray(report.aiAnalyses) ? report.aiAnalyses : [];
  const healingPayloads = Array.isArray(report.healingPayloads) ? report.healingPayloads : [];
  const healingMarkdown = report.healingMarkdown || '';
  const galleryState = { items: [], index: 0, timer: null, title: '' };

  const combinedArtifactsByTest = (() => {
    const map = {};
    for (const test of tests) {
      const key = String((test.file || '') + '::' + (test.fullName || test.title || ''));
      if (!map[key]) map[key] = { screenshots: [], videos: [] };
      const shots = (test.artifacts && test.artifacts.screenshots) || [];
      const vids = (test.artifacts && test.artifacts.videos) || [];
      for (const s of shots) if (!map[key].screenshots.includes(s)) map[key].screenshots.push(s);
      for (const v of vids) if (!map[key].videos.includes(v)) map[key].videos.push(v);
    }
    return map;
  })();

  function escHtml(value) {
    return String(value || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  }

  function normalizeMediaPath(rawPath) {
    var p = String(rawPath || '');
    if (!p) return '';
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    var n = p.replace(/\\\\\\\\/g, '/');
    if (n.startsWith('./') || n.startsWith('../') || !n.startsWith('/')) return n;
    var idx = n.indexOf('/test-results/');
    if (idx >= 0) return '..' + n.slice(idx);
    return n;
  }

  function renderCodeSnippet(snippet) {
    if (!snippet || !snippet.lines || snippet.lines.length === 0) return '';
    var linesHtml = snippet.lines.map(function(l) {
      return '<div class="code-line' + (l.isError ? ' error-line' : '') + '">' +
        '<span class="code-line-num">' + l.num + '</span>' +
        '<span class="code-line-marker">' + (l.isError ? '>' : ' ') + '</span>' +
        '<span class="code-line-text">' + escHtml(l.text) + '</span>' +
        '</div>';
    }).join('');
    return '<div class="code-snippet">' +
      '<div class="code-snippet-file">' + escHtml(snippet.file) + ':' + snippet.line + ':' + snippet.column + '</div>' +
      '<div class="code-snippet-lines">' + linesHtml + '</div>' +
      '</div>';
  }

  function formatMs(ms) {
    if (!Number.isFinite(ms)) return "0ms";
    if (ms < 1000) return ms + "ms";
    const s = ms / 1000;
    if (s < 60) return s.toFixed(1) + "s";
    const m = Math.floor(s / 60);
    return m + "m " + Math.round(s % 60) + "s";
  }

  function passPercent() {
    if (!summary.total) return 0;
    return Math.round(((summary.passed || 0) / summary.total) * 100);
  }

  function overallStatus() {
    if ((summary.failed || 0) > 0 || (summary.timedOut || 0) > 0) return "failed";
    if ((summary.interrupted || 0) > 0) return "interrupted";
    return "passed";
  }

  function statusClass(s) {
    if (s === "passed") return "status-passed-icon";
    if (s === "skipped") return "status-skipped-icon";
    return "status-failed-icon";
  }

  function statusSymbol(s) {
    if (s === "passed") return "\\u2713";
    if (s === "skipped") return "\\u2013";
    return "\\u2717";
  }

  function suiteKey(t) { return t.file || t.suite || "unknown"; }
  function suiteTitle(t) { return t.suite || (t.file ? t.file.split("/").pop() : "Unnamed Suite"); }

  function testScope(t) {
    const f = String(t.file || "").toLowerCase();
    if (f.includes('/api/') || f.includes('\\\\\\\\api\\\\\\\\')) return 'api';
    if (f.includes('/ui/') || f.includes('\\\\\\\\ui\\\\\\\\')) return 'ui';
    return 'other';
  }

  // Extract tags from test data - supports Playwright @tag in title and tags[] array
  function getTestTags(t) {
    var tags = [];
    // From the tags array (set by reporter from Playwright test.tags / annotations / title)
    if (Array.isArray(t.tags)) {
      for (var i = 0; i < t.tags.length; i++) tags.push(t.tags[i]);
    }
    // Also parse @tag from title/fullName as fallback (in case reporter didn't extract)
    var titleTags = (t.title || '').match(/@[\\w-]+/g);
    if (titleTags) {
      for (var j = 0; j < titleTags.length; j++) {
        if (tags.indexOf(titleTags[j]) === -1) tags.push(titleTags[j]);
      }
    }
    return tags;
  }

  // Detect test type: ui, api, e2e, unit, or other
  function testType(t) {
    var f = String(t.file || '').toLowerCase();
    var title = String(t.title || '').toLowerCase();
    var fullName = String(t.fullName || '').toLowerCase();
    var tags = getTestTags(t);
    var tagsLower = tags.map(function(tg) { return tg.toLowerCase(); });
    // Check tags first
    if (tagsLower.indexOf('@api') >= 0) return 'api';
    if (tagsLower.indexOf('@ui') >= 0) return 'ui';
    if (tagsLower.indexOf('@e2e') >= 0) return 'e2e';
    if (tagsLower.indexOf('@unit') >= 0) return 'unit';
    // Check project name
    var proj = String(t.projectName || t.browser || '').toLowerCase();
    if (proj.includes('api')) return 'api';
    // Check file path
    if (f.includes('/api/') || f.includes('\\\\api\\\\')) return 'api';
    if (f.includes('/ui/') || f.includes('\\\\ui\\\\') || f.includes('/e2e/') || f.includes('\\\\e2e\\\\')) return 'ui';
    if (f.includes('/unit/') || f.includes('\\\\unit\\\\')) return 'unit';
    // Check title
    if (title.includes('api ') || title.startsWith('api:') || fullName.includes('api')) return 'api';
    return 'other';
  }

  // Collect all unique tags across all tests
  function collectAllTags() {
    var tagSet = {};
    for (var i = 0; i < tests.length; i++) {
      var tags = getTestTags(tests[i]);
      for (var j = 0; j < tags.length; j++) {
        tagSet[tags[j]] = (tagSet[tags[j]] || 0) + 1;
      }
    }
    // Sort by frequency descending
    return Object.keys(tagSet).sort(function(a, b) { return tagSet[b] - tagSet[a]; }).map(function(tag) {
      return { tag: tag, count: tagSet[tag] };
    });
  }

  // Collect all unique test types
  function collectTestTypes() {
    var typeSet = {};
    for (var i = 0; i < tests.length; i++) {
      var tt = testType(tests[i]);
      typeSet[tt] = (typeSet[tt] || 0) + 1;
    }
    return typeSet;
  }

  function buildSuiteMap(src) {
    const map = new Map();
    for (const t of src) {
      const key = suiteKey(t);
      const cur = map.get(key) || { key, name: suiteTitle(t), file: t.file || "", tests: [] };
      cur.tests.push(t);
      map.set(key, cur);
    }
    return Array.from(map.values());
  }

  function extractFeatureName(test) {
    var fullName = test.fullName || '';
    var parts = fullName.split(' \\u203a ').filter(Boolean);
    if (parts.length > 2) {
      var middle = parts.slice(1, -1);
      if (middle.length > 0 && (middle[0].endsWith('.spec.ts') || middle[0].endsWith('.spec.js') || middle[0].endsWith('.test.ts') || middle[0].endsWith('.test.js'))) {
        var fileName = middle[0].split('/').pop().replace(/\\.(spec|test)\\.(ts|js|mjs)$/, '');
        if (middle.length > 1) {
          return middle.slice(1).join(' > ');
        }
        return fileName;
      }
      return middle.join(' > ');
    }
    var suite = test.suite || '';
    if (suite) return suite;
    return (test.file || 'unknown').split('/').pop().replace(/\\.(spec|test)\\.(ts|js|mjs)$/, '');
  }

  function buildBddHierarchy(sourceTests) {
    var featureMap = new Map();
    for (var i = 0; i < sourceTests.length; i++) {
      var test = sourceTests[i];
      // Explicit feature name from addFeature() takes priority over auto-extraction
      var explicitFeature = test.featureMeta && test.featureMeta.name ? test.featureMeta : null;
      var featureName = explicitFeature ? explicitFeature.name : extractFeatureName(test);
      var featureKey = (test.file || '') + '::' + featureName;
      if (!featureMap.has(featureKey)) {
        featureMap.set(featureKey, {
          name: featureName,
          description: explicitFeature ? (explicitFeature.description || null) : null,
          file: test.file || '',
          status: 'passed',
          duration: 0,
          scenarios: [],
          tests: []
        });
      }
      var feature = featureMap.get(featureKey);
      // Update description if a later test in the same feature provides one
      if (explicitFeature && explicitFeature.description && !feature.description) {
        feature.description = explicitFeature.description;
      }
      var ns = test.status === 'timedOut' ? 'failed' : test.status;
      var scenario = {
        name: test.title || test.fullName,
        description: test.scenarioDescription || null,
        status: ns,
        duration: test.durationMs || 0,
        retries: test.retries || 0,
        behaviours: Array.isArray(test.behaviours) && test.behaviours.length > 0 ? test.behaviours : null,
        steps: (test.steps || []).map(function(step) {
          return { name: step.title, status: step.status, duration: step.durationMs || 0, error: step.error || null, category: step.category };
        }),
        test: test
      };
      if (scenario.steps.length === 0 && ns === 'failed' && test.errorMessage) {
        scenario.steps.push({ name: 'Test execution', status: 'failed', duration: test.durationMs || 0, error: test.errorMessage, category: 'test' });
      } else if (scenario.steps.length === 0 && ns === 'passed') {
        scenario.steps.push({ name: 'Test execution', status: 'passed', duration: test.durationMs || 0, error: null, category: 'test' });
      }
      feature.scenarios.push(scenario);
      feature.tests.push(test);
      feature.duration += (test.durationMs || 0);
      if (ns === 'failed') feature.status = 'failed';
      else if (ns === 'skipped' && feature.status !== 'failed') {
        var allSkipped = feature.scenarios.every(function(s) { return s.status === 'skipped'; });
        if (allSkipped) feature.status = 'skipped';
      }
    }
    return Array.from(featureMap.values());
  }

  function getBddSummary(features) {
    var totalFeatures = features.length;
    var totalScenarios = 0, totalSteps = 0;
    var passedS = 0, failedS = 0, skippedS = 0;
    for (var i = 0; i < features.length; i++) {
      var f = features[i];
      totalScenarios += f.scenarios.length;
      for (var j = 0; j < f.scenarios.length; j++) {
        var sc = f.scenarios[j];
        totalSteps += (sc.behaviours && sc.behaviours.length > 0) ? sc.behaviours.length : sc.steps.length;
        if (sc.status === 'passed') passedS++;
        else if (sc.status === 'failed') failedS++;
        else skippedS++;
      }
    }
    return { totalFeatures: totalFeatures, totalScenarios: totalScenarios, totalSteps: totalSteps, passed: passedS, failed: failedS, skipped: skippedS };
  }

  function sortByDurationDesc(arr) { return arr.slice().sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0)); }

  function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(function() {
      btn.textContent = 'Copied!'; btn.classList.add('copied');
      setTimeout(function() { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1800);
    }).catch(function() {
      btn.textContent = 'Failed'; setTimeout(function() { btn.textContent = 'Copy'; }, 1500);
    });
  }
  window.copyToClipboard = copyToClipboard;

  function countAllScreenshots() {
    var count = 0;
    for (var i = 0; i < tests.length; i++) {
      count += ((tests[i].artifacts && tests[i].artifacts.screenshots) || []).length;
    }
    return count;
  }
  function countAllVideos() {
    var count = 0;
    for (var i = 0; i < tests.length; i++) {
      count += ((tests[i].artifacts && tests[i].artifacts.videos) || []).length;
    }
    return count;
  }
`;
}
