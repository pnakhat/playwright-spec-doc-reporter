export function getScriptRenderers(): string {
  return `
  function renderArtifacts(test, options) {
    var opts = options || {};
    var screenshots = opts.includeScreenshots === false ? [] : ((test.artifacts && test.artifacts.screenshots) || []).slice(0, 2);
    var videos = opts.includeVideos === true ? ((test.artifacts && test.artifacts.videos) || []).slice(0, 1) : [];
    if (screenshots.length === 0 && videos.length === 0) return '';
    var mediaItems = Array.isArray(opts.mediaItems) ? opts.mediaItems
      : [...screenshots.map((src, i) => ({ type: 'image', src, label: 'Screenshot ' + (i + 1) })),
         ...videos.map((src, i) => ({ type: 'video', src, label: 'Video ' + (i + 1) }))];
    var galleryPayload = encodeURIComponent(JSON.stringify(mediaItems));
    var ssHtml = screenshots.map((p, i) =>
      '<div class="artifact-card"><div class="artifact-label">Screenshot ' + (i + 1) + '</div>' +
      '<img class="js-screenshot-thumb" onclick="openScreenshotGalleryFromEl(this)" data-gallery-items="' + galleryPayload + '" data-gallery-index="' + i + '" src="' + escHtml(normalizeMediaPath(p)) + '" alt="screenshot" loading="lazy" /></div>'
    ).join('');
    var vidHtml = videos.map((p, i) =>
      '<div class="artifact-card"><div class="artifact-label">Video ' + (i + 1) + '</div>' +
      '<video controls preload="metadata" src="' + escHtml(normalizeMediaPath(p)) + '"></video>' +
      '<a class="artifact-link" href="' + escHtml(normalizeMediaPath(p)) + '" target="_blank" rel="noreferrer">Open in new tab \\u2197</a></div>'
    ).join('');
    return '<div class="artifact-grid">' + ssHtml + vidHtml + '</div>';
  }

  function renderTestLevelArtifacts(test, galleryId) {
    var key = String((test.file || '') + '::' + (test.fullName || test.title || ''));
    var combined = combinedArtifactsByTest[key] || { screenshots: [], videos: [] };
    var ss = combined.screenshots, vids = combined.videos;
    if (ss.length === 0 && vids.length === 0) return '';
    var mediaItems = [...ss.map((src, i) => ({ type: 'image', src, label: 'Screenshot ' + (i + 1) })),
                      ...vids.map((src, i) => ({ type: 'video', src, label: 'Video ' + (i + 1) }))];
    var previewHtml = renderArtifacts({ artifacts: { screenshots: ss.slice(0, 2), videos: vids } }, { includeScreenshots: true, includeVideos: true, mediaItems });
    var mediaSummary = '<div class="media-summary">Screenshots: ' + ss.length + (vids.length > 0 ? ' \\u00b7 Videos: ' + vids.length : '') + '</div>';
    if (ss.length === 0) return previewHtml + mediaSummary;
    var fullPayload = encodeURIComponent(JSON.stringify(mediaItems));
    var allSsHtml = ss.map((p, i) =>
      '<div class="artifact-card"><div class="artifact-label">Screenshot ' + (i + 1) + '</div>' +
      '<img class="js-screenshot-thumb" onclick="openScreenshotGalleryFromEl(this)" data-gallery-items="' + fullPayload + '" data-gallery-index="' + i + '" src="' + escHtml(normalizeMediaPath(p)) + '" alt="screenshot" loading="lazy" /></div>'
    ).join('');
    return previewHtml + mediaSummary +
      '<button class="screenshot-toggle" data-target="' + galleryId + '" onclick="toggleScreenshotGallery(this)">Show all screenshots (' + ss.length + ')</button>' +
      '<div class="artifact-grid screenshot-gallery" id="' + galleryId + '">' + allSsHtml + '</div>';
  }

  function renderTop() {
    document.getElementById("brand-title").textContent = report.title || "Playwright Suite";
    document.getElementById("meta-time").textContent = "\\ud83d\\udd50 " + new Date(report.generatedAt).toLocaleString();
    document.getElementById("meta-duration").textContent = "\\u23f1 " + formatMs(summary.durationMs || 0);
    document.getElementById("hero-title").textContent = report.title || "Playwright Suite";
    document.getElementById("hero-subtitle").textContent = "Test Run \\u00b7 " + new Date(report.generatedAt).toLocaleString();

    const status = overallStatus();
    const heroStatus = document.getElementById("hero-status");
    heroStatus.className = "hero-status " + (status === "passed" ? "status-passed" : status === "failed" ? "status-failed" : "status-interrupted");
    heroStatus.textContent = status === "passed" ? "\\u2713 All Passing" : status === "failed" ? "\\u2717 Failures Detected" : "\\u26a0 Interrupted";

    const failedCount = (summary.failed || 0) + (summary.timedOut || 0);
    if (failedCount > 0) {
      document.getElementById("failure-banner").classList.add("visible");
      document.getElementById("banner-msg").innerHTML = '\\u26a1 ' + failedCount + ' test' + (failedCount > 1 ? 's' : '') + ' failed \\u00b7 ' + passPercent() + '% pass rate';
    }

    const pct = passPercent();
    document.getElementById("donut-pct").textContent = pct + "%";
    const circumference = 2 * Math.PI * 54;
    const donut = document.getElementById("donut-pass");
    donut.setAttribute("stroke-dasharray", String(circumference));
    donut.setAttribute("stroke-dashoffset", String(circumference - (pct / 100) * circumference));
    const color = pct >= 80 ? 'var(--pass)' : pct >= 50 ? 'var(--flaky)' : 'var(--fail)';
    donut.setAttribute("stroke", color);
    document.getElementById("donut-pct").style.color = color;
  }

  function renderEnvInfo() {
    var env = report.environment || {};
    var badges = [];
    // OS
    if (env.os) {
      var osLabel = env.os === 'Darwin' ? 'macOS' : env.os === 'Windows_NT' ? 'Windows' : env.os;
      badges.push('\\ud83d\\udda5 ' + escHtml(osLabel) + (env.osVersion ? ' ' + escHtml(env.osVersion) : ''));
    } else if (env.platform) {
      badges.push('\\ud83d\\udda5 ' + escHtml(env.platform));
    }
    // Node
    if (env.nodeVersion) badges.push('\\u2b21 Node ' + escHtml(env.nodeVersion));
    // Playwright
    if (env.playwrightVersion) badges.push('\\ud83c\\udfad PW ' + escHtml(env.playwrightVersion));
    // Browsers / projects
    if (env.browsers && env.browsers.length > 0) {
      env.browsers.forEach(function(b) { badges.push('\\ud83c\\udf10 ' + escHtml(b)); });
    }
    // Workers
    if (env.workers) badges.push('\\u26a1 ' + env.workers + ' worker' + (env.workers !== 1 ? 's' : ''));
    // CI
    if (env.ci) badges.push('\\ud83d\\udd04 CI');
    // Run window
    if (env.startedAt && env.finishedAt) {
      var start = new Date(env.startedAt);
      var end = new Date(env.finishedAt);
      var durSec = Math.round((end - start) / 1000);
      var durLabel = durSec < 60 ? durSec + 's' : Math.floor(durSec / 60) + 'm ' + (durSec % 60) + 's';
      badges.push('\\u23f0 ' + start.toLocaleTimeString() + ' \\u2192 ' + end.toLocaleTimeString() + ' (' + durLabel + ')');
    }
    document.getElementById("env-row").innerHTML = badges.map(function(b) {
      return '<span class="env-badge">' + b + '</span>';
    }).join('');
  }

  function renderProgressBar() {
    const total = summary.total || 1;
    const passed = summary.passed || 0;
    const failed = (summary.failed || 0) + (summary.timedOut || 0);
    const skipped = summary.skipped || 0;
    const flaky = summary.flaky || 0;
    const pct = (n) => (n / total * 100).toFixed(2);
    document.getElementById("progress-stack").innerHTML =
      (passed > 0 ? '<div class="progress-seg progress-seg-pass" style="width:' + pct(passed) + '%"></div>' : '') +
      (failed > 0 ? '<div class="progress-seg progress-seg-fail" style="width:' + pct(failed) + '%"></div>' : '') +
      (skipped > 0 ? '<div class="progress-seg progress-seg-skip" style="width:' + pct(skipped) + '%"></div>' : '') +
      (flaky > 0 ? '<div class="progress-seg progress-seg-flaky" style="width:' + pct(flaky) + '%"></div>' : '');
    const labels = [];
    if (passed > 0) labels.push('<span class="progress-label"><span class="progress-dot" style="background:var(--pass)"></span>' + passed + ' passed</span>');
    if (failed > 0) labels.push('<span class="progress-label"><span class="progress-dot" style="background:var(--fail)"></span>' + failed + ' failed</span>');
    if (skipped > 0) labels.push('<span class="progress-label"><span class="progress-dot" style="background:var(--skip)"></span>' + skipped + ' skipped</span>');
    if (flaky > 0) labels.push('<span class="progress-label"><span class="progress-dot" style="background:var(--flaky)"></span>' + flaky + ' flaky</span>');
    document.getElementById("progress-labels").innerHTML = labels.join('');
  }

  function renderStats() {
    // Compute number of tests with a non-zero flakiness score
    var flakyCount = 0;
    var maxScore = 0;
    for (var i = 0; i < tests.length; i++) {
      var fs = getFlakinessScore(tests[i]);
      if (fs > 0) { flakyCount++; if (fs > maxScore) maxScore = fs; }
    }
    var flakyLevel = maxScore >= 70 ? 'high' : maxScore >= 30 ? 'medium' : maxScore > 0 ? 'low' : 'stable';
    var flakyColor = maxScore >= 70 ? 'var(--fail)' : maxScore >= 30 ? 'var(--flaky)' : maxScore > 0 ? 'var(--flaky)' : 'var(--pass)';

    const stats = [
      { klass: "stat-pass", icon: "\\u2705", value: summary.passed || 0, label: "Passed" },
      { klass: "stat-fail", icon: "\\u274c", value: (summary.failed || 0) + (summary.timedOut || 0), label: "Failed" },
      { klass: "stat-skip", icon: "\\u23ed", value: summary.skipped || 0, label: "Skipped" },
      { klass: "stat-flaky", icon: "\\u26a1", value: summary.flaky || 0, label: "Flaky" },
      { klass: "stat-duration", icon: "\\u23f1", value: formatMs(summary.durationMs || 0), label: "Duration", small: true },
      { klass: "stat-total", icon: "\\ud83e\\uddea", value: summary.total || 0, label: "Total" }
    ];
    var statsHtml = stats.map((item) =>
      '<div class="stat-card ' + item.klass + '">' +
      '<div class="stat-icon">' + item.icon + '</div>' +
      '<div class="stat-value"' + (item.small ? ' style="font-size:1.4rem"' : '') + '>' + item.value + '</div>' +
      '<div class="stat-label">' + item.label + '</div>' +
      '</div>'
    ).join('');

    // Flakiness history card (only when we have history data)
    if (Object.keys(flakinessScores).length > 0) {
      statsHtml += '<div class="stat-card" style="grid-column:span 2">' +
        '<div class="stat-icon">&#9889;</div>' +
        '<div class="stat-label" style="margin-bottom:0.5rem">Flakiness (history)</div>' +
        '<div class="flakiness-score-card">' +
          '<span style="font-size:1.1rem;font-weight:800;color:' + flakyColor + '">' + flakyCount + '</span>' +
          '<span style="font-size:0.72rem;color:var(--text3)">unstable tests</span>' +
          '<div class="flakiness-bar-wrap"><div class="flakiness-bar flaky-' + flakyLevel + '" style="width:' + Math.min(maxScore, 100) + '%"></div></div>' +
          '<span style="font-size:0.72rem;font-weight:700;color:' + flakyColor + '">' + (maxScore > 0 ? 'max ' + maxScore + '%' : 'stable') + '</span>' +
        '</div>' +
      '</div>';
    }

    document.getElementById("stats-grid").innerHTML = statsHtml;
  }

  function renderBddSummary() {
    var features = buildBddHierarchy(tests);
    var s = getBddSummary(features);
    document.getElementById('bdd-summary').innerHTML =
      '<div class="bdd-summary-item"><span class="bdd-label bdd-feature">Feature</span> <span class="bdd-summary-value">' + s.totalFeatures + '</span></div>' +
      '<div class="bdd-summary-sep"></div>' +
      '<div class="bdd-summary-item"><span class="bdd-label bdd-scenario">Scenario</span> <span class="bdd-summary-value">' + s.totalScenarios + '</span>' +
        '<span style="font-size:0.68rem;color:var(--text3)">(' + s.passed + ' pass / ' + s.failed + ' fail / ' + s.skipped + ' skip)</span></div>' +
      '<div class="bdd-summary-sep"></div>' +
      '<div class="bdd-summary-item"><span class="bdd-label bdd-step">Step</span> <span class="bdd-summary-value">' + s.totalSteps + '</span></div>';
  }

  function renderAI() {
    const el = document.getElementById("ai-section");
    if (aiAnalyses.length === 0) {
      var aiMsg = aiEnabled
        ? '<div class="ai-disabled-icon">\\ud83d\\udd11</div>' +
          '<div style="font-size:0.86rem;font-weight:700;color:var(--text1);margin-bottom:0.3rem">API Key Required</div>' +
          '<div style="font-size:0.78rem;margin-bottom:0.6rem">AI analysis is enabled but no API key was found. Set your <code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:4px">ANTHROPIC_API_KEY</code> (or <code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:4px">OPENAI_API_KEY</code>) environment variable and rerun the tests.</div>' +
          '<div style="font-size:0.75rem;color:var(--text3)">Tip: create a <code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:4px">.env</code> file in your project root and load it via <code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:4px">node --env-file=.env</code> or dotenv.</div>'
        : '<div class="ai-disabled-icon">\\ud83e\\udd16</div>' +
          '<div style="font-size:0.86rem;font-weight:700;color:var(--text1);margin-bottom:0.3rem">AI Analysis Not Configured</div>' +
          '<div style="font-size:0.78rem">Add an <code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:4px">ai</code> block to your reporter config to enable intelligent failure analysis and remediation suggestions.</div>' +
          '<div style="font-size:0.75rem;color:var(--text3);margin-top:0.5rem">Supports Anthropic (Claude) and OpenAI (GPT-4) out of the box.</div>';
      el.innerHTML =
        '<div class="section-header"><div class="section-title">\\ud83e\\udd16 AI Analysis</div></div>' +
        '<div class="ai-disabled">' + aiMsg + '</div>';
      return;
    }
    const byCategory = aiAnalyses.reduce((acc, item) => {
      const key = item.issueCategory || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const topFindings = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([cat, cnt]) => ({ cat, cnt }));
    const avgConf = aiAnalyses.reduce((s, i) => s + (Number(i.confidence) || 0), 0) / aiAnalyses.length;
    const health = Math.round(avgConf * 100);
    const healthColor = health >= 70 ? 'var(--pass)' : health >= 40 ? 'var(--flaky)' : 'var(--fail)';

    const findingsHtml = topFindings.map((item) => {
      const cls = item.cat.toLowerCase().includes('error') || item.cat.toLowerCase().includes('fail') ? 'finding-error' : 'finding-warning';
      return '<div class="finding-item ' + cls + '"><span>' + escHtml(item.cat) + '</span><span class="finding-count">' + item.cnt + '</span></div>';
    }).join('');

    const remediations = aiAnalyses.map(i => i.suggestedRemediation).filter(Boolean).slice(0, 5)
      .map(t => '<div class="ai-remediation"><span class="ai-remediation-dot">\\u2022</span><span>' + escHtml(t) + '</span></div>').join('');

    el.innerHTML =
      '<div class="section-header">' +
        '<div class="section-title">\\ud83e\\udd16 AI Analysis <span style="font-size:0.73rem;font-weight:400;color:var(--text2)">' + aiAnalyses.length + ' tests analyzed</span></div>' +
        '<div style="display:flex;align-items:center;gap:8px;font-size:0.76rem;color:var(--text2)">' +
          '<span>Health</span>' +
          '<div style="width:80px"><div class="ai-health-bar"><div class="ai-health-fill" style="width:' + health + '%;background:' + healthColor + '"></div></div></div>' +
          '<span style="color:' + healthColor + ';font-weight:700">' + health + '/100</span>' +
        '</div>' +
      '</div>' +
      '<div class="ai-summary">AI analyzed <strong>' + aiAnalyses.length + ' failed test' + (aiAnalyses.length !== 1 ? 's' : '') + '</strong> \\u2014 identified failure categories and remediation guidance.</div>' +
      '<div class="ai-grid">' +
        '<div class="ai-card"><div class="ai-card-title">\\ud83d\\udd0d Key Findings</div>' + (findingsHtml || '<div style="color:var(--text3);font-size:0.78rem">No findings categorized.</div>') + '</div>' +
        '<div class="ai-card"><div class="ai-card-title">\\ud83d\\udd27 Suggested Remediations</div>' + (remediations || '<div style="color:var(--text3);font-size:0.78rem">No remediations available.</div>') + '</div>' +
      '</div>';
  }

  function renderBehavioursSection(behaviours) {
    if (!behaviours || behaviours.length === 0) return '';
    var rows = behaviours.map(function(b) {
      return '<li class="behaviour-item">' + escHtml(b) + '</li>';
    }).join('');
    return '<div class="behaviours-section"><ul class="behaviours-list">' + rows + '</ul></div>';
  }

  function syntaxHighlightJson(obj) {
    var str;
    try { str = JSON.stringify(obj, null, 2); } catch(e) { return escHtml(String(obj)); }
    return escHtml(str).replace(
      /(&quot;)((?:[^&]|&(?!quot;))*?)(&quot;)(\s*:)|(&quot;)((?:[^&]|&(?!quot;))*?)(&quot;)|(\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(true|false|null)/g,
      function(m, q1, k, q2, col, q3, v, q4, num, kw) {
        if (col) return '<span class="json-key">' + q1 + k + q2 + '</span>' + col;
        if (v !== undefined) return '<span class="json-str">' + q3 + v + q4 + '</span>';
        if (num) return '<span class="json-num">' + num + '</span>';
        if (kw) return '<span class="json-kw">' + kw + '</span>';
        return m;
      }
    );
  }

  function renderApiSection(apiEntries) {
    if (!apiEntries || apiEntries.length === 0) return '';
    // Group into request/response pairs
    var groups = [];
    var cur = null;
    for (var i = 0; i < apiEntries.length; i++) {
      var e = apiEntries[i];
      if (e.kind === 'request') {
        cur = { request: e, response: null };
        groups.push(cur);
      } else if (e.kind === 'response') {
        if (cur && cur.response === null) { cur.response = e; cur = null; }
        else groups.push({ request: null, response: e });
      }
    }
    var html = '<div class="api-section">';
    groups.forEach(function(g, gi) {
      html += '<div class="api-call-block">';
      if (g.request) {
        var req = g.request;
        var methodCls = 'api-method api-method-' + (req.method || 'GET').toLowerCase();
        html += '<div class="api-call-row">' +
          '<span class="' + methodCls + '">' + escHtml(req.method || 'GET') + '</span>' +
          '<span class="api-url">' + escHtml(req.url || '') + '</span>' +
        '</div>';
        if (req.body !== undefined && req.body !== null) {
          html += '<div class="api-body-label">Request Body</div>' +
            '<pre class="api-json-block">' + syntaxHighlightJson(req.body) + '</pre>';
        }
        if (req.headers && Object.keys(req.headers).length > 0) {
          html += '<details class="api-headers-toggle"><summary>Request Headers</summary>' +
            '<pre class="api-json-block">' + syntaxHighlightJson(req.headers) + '</pre></details>';
        }
      }
      if (g.response) {
        var res = g.response;
        var statusOk = res.status && res.status < 400;
        html += '<div class="api-response-row">' +
          '<span class="api-status ' + (statusOk ? 'api-status-ok' : 'api-status-err') + '">' +
            escHtml(String(res.status || '')) +
          '</span>' +
          '<span class="api-response-label">Response</span>' +
        '</div>';
        if (res.body !== undefined && res.body !== null) {
          html += '<div class="api-body-label">Response Body</div>' +
            '<pre class="api-json-block">' + syntaxHighlightJson(res.body) + '</pre>';
        }
        if (res.headers && Object.keys(res.headers).length > 0) {
          html += '<details class="api-headers-toggle"><summary>Response Headers</summary>' +
            '<pre class="api-json-block">' + syntaxHighlightJson(res.headers) + '</pre></details>';
        }
      }
      html += '</div>';
      if (gi < groups.length - 1) html += '<div class="api-call-divider"></div>';
    });
    html += '</div>';
    return html;
  }

  function renderStepsTable(steps, testId) {
    if (!steps || steps.length === 0) return '<div style="padding:0.45rem 0;color:var(--text3);font-size:0.77rem">No steps recorded.</div>';
    var allStepMedia = [];
    steps.forEach(function(s, si) {
      (s.screenshots || []).forEach(function(src, idx) {
        allStepMedia.push({ type: 'image', src, label: 'Step ' + (si + 1) + ' \\u00b7 Screenshot ' + (idx + 1) });
      });
    });
    var galleryPayload = encodeURIComponent(JSON.stringify(allStepMedia));
    var mediaIdx = 0;
    var rows = steps.map(function(step) {
      var isFailed = step.status === 'failed';
      var ssHtml = '';
      if (step.screenshots && step.screenshots.length > 0) {
        ssHtml = step.screenshots.map(function(src) {
          var ci = mediaIdx++;
          return '<img class="step-screenshot js-screenshot-thumb" onclick="openScreenshotGalleryFromEl(this)" data-gallery-items="' + galleryPayload + '" data-gallery-index="' + ci + '" src="' + escHtml(normalizeMediaPath(src)) + '" alt="step screenshot" loading="lazy" />';
        }).join('');
      }
      return '<tr><td style="width:28px;text-align:center"><span class="step-status ' + (isFailed ? 'status-failed-icon' : 'status-passed-icon') + '">' + (isFailed ? '\\u2717' : '\\u2713') + '</span></td>' +
        '<td><span class="step-title-text">' + escHtml(step.title) + (step.category ? '<span class="step-category">' + escHtml(step.category) + '</span>' : '') + '</span>' +
        (isFailed && step.error ? '<div class="step-error">' + escHtml(step.error) + '</div>' : '') + ssHtml + '</td>' +
        '<td style="width:72px;text-align:right;white-space:nowrap;color:var(--text2);font-family:var(--font-mono)">' + formatMs(step.durationMs || 0) + '</td></tr>';
    }).join('');
    return '<div class="steps-section"><table class="steps-table"><thead><tr><th></th><th><span class="bdd-label bdd-step" style="margin-right:4px">Steps</span></th><th style="text-align:right">Duration</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function renderTestAIInsight(test) {
    var a = aiAnalyses.find(function(x) { return x.file === test.file && x.testName === test.fullName; });
    if (!a) return '';
    var confPct = Math.round((a.confidence || 0) * 100);
    var confColor = confPct >= 70 ? 'var(--pass)' : confPct >= 40 ? 'var(--flaky)' : 'var(--fail)';
    return '<div class="ai-insight">' +
      '<div class="ai-insight-header"><span class="ai-insight-label">\\ud83e\\udd16 AI Analysis</span><span class="ai-insight-conf" style="color:' + confColor + '">' + confPct + '% confidence</span></div>' +
      '<div class="ai-insight-row"><strong>Root Cause:</strong> ' + escHtml(a.likelyRootCause) + '</div>' +
      '<div class="ai-insight-row" style="color:var(--text2)"><strong>Category:</strong> ' + escHtml(a.issueCategory) + '</div>' +
      (a.suggestedRemediation ? '<div class="ai-insight-row" style="color:var(--text2)"><strong>Fix:</strong> ' + escHtml(a.suggestedRemediation) + '</div>' : '') +
      '</div>';
  }

  function renderTestDetailBlock(test, testIdx, autoExpand) {
    var ns = test.status === 'timedOut' ? 'failed' : test.status;
    var isFailed = ns === 'failed';
    var shouldExpand = autoExpand && isFailed;
    var key = String((test.file || '') + '::' + (test.fullName || test.title || ''));
    var combined = combinedArtifactsByTest[key] || { screenshots: [], videos: [] };
    var behaviours = Array.isArray(test.behaviours) && test.behaviours.length > 0 ? test.behaviours : null;
    var apiEntries = Array.isArray(test.apiEntries) && test.apiEntries.length > 0 ? test.apiEntries : null;
    var apiCallCount = apiEntries ? apiEntries.filter(function(e) { return e.kind === 'request'; }).length : 0;
    var steps = test.steps || [];
    var failedSteps = steps.filter(function(s) { return s.status === 'failed'; }).length;
    var detailId = 'test-detail-' + testIdx;
    var galleryId = 'detail-gallery-' + testIdx;

    var videoHtml = '';
    if (combined.videos.length > 0) {
      videoHtml = '<div class="video-section">' + combined.videos.map(function(vp) {
        return '<div class="artifact-card"><div class="artifact-label">Test Video</div>' +
          '<video controls preload="metadata" src="' + escHtml(normalizeMediaPath(vp)) + '"></video>' +
          '<a class="artifact-link" href="' + escHtml(normalizeMediaPath(vp)) + '" target="_blank" rel="noreferrer">Open in new tab \\u2197</a></div>';
      }).join('') + '</div>';
    }

    var ssGalleryHtml = '';
    if (combined.screenshots.length > 0) {
      var mediaItems = combined.screenshots.map(function(src, i) {
        var label = 'Screenshot ' + (i + 1);
        if (test.attachments) {
          var imgAtts = test.attachments.filter(function(a) { return a.contentType && a.contentType.indexOf('image') >= 0 && a.path; });
          if (imgAtts[i] && imgAtts[i].name && imgAtts[i].name !== 'screenshot') label = imgAtts[i].name;
        }
        return { type: 'image', src, label };
      });
      var allMedia = mediaItems.concat(combined.videos.map(function(src, i) { return { type: 'video', src, label: 'Video ' + (i + 1) }; }));
      var gp = encodeURIComponent(JSON.stringify(allMedia));
      var thumbs = combined.screenshots.map(function(src, i) {
        return '<div class="artifact-card"><div class="artifact-label">' + escHtml(mediaItems[i].label) + '</div>' +
          '<img class="js-screenshot-thumb" onclick="openScreenshotGalleryFromEl(this)" data-gallery-items="' + gp + '" data-gallery-index="' + i + '" src="' + escHtml(normalizeMediaPath(src)) + '" alt="' + escHtml(mediaItems[i].label) + '" loading="lazy" /></div>';
      }).join('');
      ssGalleryHtml = '<div style="margin-top:0.6rem"><div style="font-size:0.75rem;font-weight:700;color:var(--text2);margin-bottom:0.38rem">\\ud83d\\udcf7 Screenshots (' + combined.screenshots.length + ')</div><div class="artifact-grid">' + thumbs + '</div></div>';
    }

    var errorHtml = '';
    if (isFailed && test.errorMessage) {
      var safeErr = escHtml(test.errorMessage);
      errorHtml = '<div class="test-error"><button class="copy-btn" onclick="copyToClipboard(this.nextElementSibling.textContent, this)">Copy</button><pre>' + safeErr + '</pre></div>' + renderCodeSnippet(test.errorSnippet);
    }

    var tt = testType(test);
    var testTags = getTestTags(test);
    var tagsAttr = testTags.join(',');
    var typePillHtml = '<span class="test-type-pill test-type-' + tt + '">' + (tt === 'other' ? '' : tt.toUpperCase()) + '</span>';
    var tagPillsHtml = testTags.map(function(tag) {
      return '<span class="test-tag-pill" onclick="event.stopPropagation();filterByTag(\\''+escHtml(tag)+'\\')">' + escHtml(tag) + '</span>';
    }).join('');

    return '<div class="test-detail-block" data-status="' + ns + '" data-scope="' + testScope(test) + '" data-type="' + tt + '" data-tags="' + escHtml(tagsAttr) + '">' +
      '<div class="test-detail-header" onclick="toggleTestDetail(this)">' +
        '<div style="display:flex;align-items:center;gap:7px;flex:1;min-width:0">' +
          '<span class="status-icon ' + statusClass(ns) + '">' + statusSymbol(ns) + '</span>' +
          (tt !== 'other' ? typePillHtml : '') +
          '<span class="bdd-label bdd-scenario" style="margin-right:3px">Scenario</span>' +
          '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:0.82rem;font-weight:600">' + escHtml(test.title || test.fullName) + '</span>' +
          tagPillsHtml +
          (behaviours ? '<span class="media-pill behaviour-pill">' + behaviours.length + ' behaviours</span>' : (steps.length > 0 ? '<span class="media-pill">' + steps.length + ' steps</span>' : '')) +
          (!behaviours && failedSteps > 0 ? '<span class="media-pill" style="background:rgba(239,68,68,0.14);color:var(--fail)">' + failedSteps + ' failed</span>' : '') +
          (apiCallCount > 0 ? '<span class="media-pill api-pill">' + apiCallCount + (apiCallCount === 1 ? ' API call' : ' API calls') + '</span>' : '') +
          (combined.screenshots.length > 0 ? '<span class="media-pill">\\ud83d\\udcf7 ' + combined.screenshots.length + '</span>' : '') +
          (combined.videos.length > 0 ? '<span class="media-pill">\\ud83c\\udfac ' + combined.videos.length + '</span>' : '') +
          (test.flaky ? '<span class="badge badge-flaky" style="margin-left:4px">flaky</span>' : '') +
          (function() { var fs = getFlakinessScore(test); return fs > 0 ? ' ' + renderFlakinessBadge(fs) : ''; })() +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:7px;flex-shrink:0">' +
          (function() {
            var proj = test.projectName || test.browser || '';
            if (!proj) return '';
            var lower = proj.toLowerCase();
            var icon = lower === 'chromium' ? '\\ud83d\\udfe2' : lower === 'firefox' ? '\\ud83e\\uddb8' : lower === 'webkit' || lower === 'safari' ? '\\ud83c\\udf0a' : lower === 'api' ? '\\ud83d\\udd17' : '\\ud83c\\udf10';
            var bg = lower === 'chromium' ? 'rgba(34,197,94,0.13)' : lower === 'firefox' ? 'rgba(249,115,22,0.15)' : lower === 'webkit' || lower === 'safari' ? 'rgba(99,102,241,0.15)' : lower === 'api' ? 'rgba(20,184,166,0.13)' : 'var(--bg4)';
            var color = lower === 'chromium' ? '#22c55e' : lower === 'firefox' ? '#f97316' : lower === 'webkit' || lower === 'safari' ? '#818cf8' : lower === 'api' ? '#14b8a6' : 'var(--text3)';
            return '<span style="font-size:0.67rem;font-weight:600;color:' + color + ';background:' + bg + ';padding:2px 8px;border-radius:20px;letter-spacing:0.01em">' + icon + ' ' + escHtml(proj) + '</span>';
          })() +
          '<span style="font-size:0.7rem;color:var(--text2);font-family:var(--font-mono)">' + formatMs(test.durationMs || 0) + '</span>' +
          '<span class="suite-toggle' + (shouldExpand ? ' open' : '') + '">\\u25b6</span>' +
        '</div>' +
      '</div>' +
      '<div class="test-detail-body' + (shouldExpand ? ' open' : '') + '" id="' + detailId + '">' +
        (test.scenarioDescription ? '<div class="scenario-description">' + escHtml(test.scenarioDescription) + '</div>' : '') +
        errorHtml + renderTestAIInsight(test) + (behaviours ? renderBehavioursSection(behaviours) : renderStepsTable(steps, detailId)) + (apiEntries ? renderApiSection(apiEntries) : '') + ssGalleryHtml + videoHtml +
      '</div>' +
    '</div>';
  }

  function renderSuiteBlocks(sourceTests, containerId, expandFailed) {
    if (expandFailed === undefined) expandFailed = false;
    var features = buildBddHierarchy(sourceTests);
    if (features.length === 0) {
      document.getElementById(containerId).innerHTML = '<div class="empty-state"><div class="empty-state-icon">\\ud83c\\udfaf</div><div class="empty-state-title">No features here</div><div class="empty-state-msg">No tests match the current filters.</div></div>';
      return;
    }
    var html = features.map(function(feature, fi) {
      var passed = feature.scenarios.filter(function(s) { return s.status === 'passed'; }).length;
      var failed = feature.scenarios.filter(function(s) { return s.status === 'failed'; }).length;
      var skipped = feature.scenarios.filter(function(s) { return s.status === 'skipped'; }).length;
      var total = feature.scenarios.length;
      var passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
      var shouldOpen = expandFailed && failed > 0;
      var scenarioBlocks = feature.tests.map(function(test, ti) {
        return renderTestDetailBlock(test, 'feat' + fi + '-sc' + ti, expandFailed);
      }).join('');
      return '<div class="suite-block ' + (failed > 0 ? 'suite-failed' : 'suite-passed') + '">' +
        '<div class="suite-header" onclick="toggleSuite(this)">' +
          '<div class="suite-header-left">' +
            '<span class="suite-toggle ' + (shouldOpen ? 'open' : '') + '">\\u25b6</span>' +
            '<div style="min-width:0">' +
              '<div class="suite-name"><span class="bdd-label bdd-feature" style="margin-right:6px">Feature</span>' + escHtml(feature.name) + '</div>' +
              (feature.description ? '<div class="feature-description">' + escHtml(feature.description) + '</div>' : '') +
              '<div class="suite-file">' + escHtml(feature.file) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="suite-header-right">' +
            '<span class="badge badge-neutral">' + total + ' scenarios</span>' +
            '<span class="badge badge-pass">\\u2713 ' + passed + '</span>' +
            (failed > 0 ? '<span class="badge badge-fail">\\u2717 ' + failed + '</span>' : '') +
            (skipped > 0 ? '<span class="badge badge-skip">\\u2013 ' + skipped + '</span>' : '') +
            '<span class="badge badge-neutral">' + passRate + '%</span>' +
            '<span style="font-size:0.68rem;color:var(--text3);font-family:var(--font-mono)">' + formatMs(feature.duration) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="suite-body ' + (shouldOpen ? 'open' : '') + '">' + scenarioBlocks + '</div>' +
      '</div>';
    }).join('');
    document.getElementById(containerId).innerHTML = html;
  }

  function renderFlatRows(sourceTests, containerId, statusFilter) {
    const rows = sortByDurationDesc(sourceTests)
      .filter(t => statusFilter === "failed" ? (t.status === "failed" || t.status === "timedOut") : t.status === statusFilter)
      .map((test, idx) => {
        const ns = test.status === "timedOut" ? "failed" : test.status;
        const galleryId = containerId + '-gallery-' + idx;
        return '<div class="suite-block ' + (ns === "failed" ? "suite-failed" : "suite-passed") + '">' +
          '<div class="suite-header" style="cursor:default">' +
            '<div class="suite-header-left"><span class="status-icon ' + statusClass(ns) + '">' + statusSymbol(ns) + '</span><span class="suite-name">' + escHtml(test.fullName) + '</span></div>' +
            '<div class="suite-header-right"><span class="badge ' + (ns === "failed" ? "badge-fail" : ns === "skipped" ? "badge-skip" : "badge-pass") + '">' + formatMs(test.durationMs || 0) + '</span></div>' +
          '</div>' +
          (ns === "failed" && test.errorMessage
            ? '<div style="padding:0.6rem 0.9rem;border-top:1px solid var(--border)">' +
              '<div class="test-error"><button class="copy-btn" onclick="copyToClipboard(this.nextElementSibling.textContent, this)">Copy</button><pre>' + escHtml(test.errorMessage) + '</pre></div>' +
              renderCodeSnippet(test.errorSnippet) + '</div>'
            : '') +
          (test.artifacts && ((test.artifacts.screenshots || []).length > 0 || (test.artifacts.videos || []).length > 0)
            ? '<div style="padding:0 0.9rem 0.6rem">' + renderTestLevelArtifacts(test, galleryId) + '</div>'
            : '') +
          '</div>';
      }).join("");
    document.getElementById(containerId).innerHTML = rows ||
      '<div class="empty-state"><div class="empty-state-icon">' + (statusFilter === 'failed' ? '\\ud83c\\udf89' : '\\u23ed') + '</div>' +
      '<div class="empty-state-title">No ' + statusFilter + ' tests</div>' +
      '<div class="empty-state-msg">' + (statusFilter === 'failed' ? 'Great \\u2014 no failures!' : 'Nothing here.') + '</div></div>';
  }

  function renderSlow() {
    const slow = sortByDurationDesc(tests).slice(0, 10);
    if (slow.length === 0) {
      document.getElementById("slowContainer").innerHTML = '<div class="empty-state"><div class="empty-state-icon">\\u23f1</div><div class="empty-state-title">No test data</div></div>';
      return;
    }
    const max = slow[0].durationMs || 1;
    document.getElementById("slowContainer").innerHTML = slow.map((test, idx) => {
      const ns = test.status === "timedOut" ? "failed" : test.status;
      return '<div class="slow-item">' +
        '<div class="slow-rank">#' + (idx + 1) + '</div>' +
        '<div class="slow-title"><span class="status-icon ' + statusClass(ns) + '" style="margin-right:6px">' + statusSymbol(ns) + '</span>' + escHtml(test.fullName) + '</div>' +
        '<div class="slow-bar-wrap"><div class="slow-bar" style="width:' + Math.max(4, Math.round(((test.durationMs || 0) / max) * 100)) + '%"></div></div>' +
        '<div class="slow-dur">' + formatMs(test.durationMs || 0) + '</div>' +
        '</div>';
    }).join("");
  }

  function renderScreenshotsTab() {
    var container = document.getElementById('screenshotsContainer');
    if (!container) return;
    var allItems = [];
    for (var i = 0; i < tests.length; i++) {
      var t = tests[i];
      var ss = (t.artifacts && t.artifacts.screenshots) || [];
      for (var j = 0; j < ss.length; j++) {
        allItems.push({ src: ss[j], testName: t.title || t.fullName, file: t.file || '', status: t.status, index: allItems.length });
      }
    }
    if (allItems.length === 0) {
      container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">\\ud83d\\udcf8</div><div class="empty-state-title">No screenshots</div><div class="empty-state-msg">No test screenshots were captured in this run.</div></div>';
      return;
    }
    var galleryPayload = encodeURIComponent(JSON.stringify(allItems.map(function(item, idx) { return { type: 'image', src: item.src, label: item.testName + ' (' + (idx + 1) + ')' }; })));
    container.innerHTML = allItems.map(function(item, idx) {
      var ns = item.status === 'timedOut' ? 'failed' : item.status;
      return '<div class="media-card" onclick="openScreenshotGalleryFromEl(this.querySelector(&#39;img&#39;))">' +
        '<img data-gallery-items="' + galleryPayload + '" data-gallery-index="' + idx + '" src="' + escHtml(normalizeMediaPath(item.src)) + '" alt="screenshot" loading="lazy" />' +
        '<div class="media-card-info">' +
          '<div class="media-card-title"><span class="status-icon ' + statusClass(ns) + '" style="margin-right:4px;font-size:0.65rem">' + statusSymbol(ns) + '</span>' + escHtml(item.testName) + '</div>' +
          '<div class="media-card-sub">' + escHtml(item.file) + '</div>' +
        '</div></div>';
    }).join('');
  }

  function renderVideosTab() {
    var container = document.getElementById('videosContainer');
    if (!container) return;
    var allItems = [];
    for (var i = 0; i < tests.length; i++) {
      var t = tests[i];
      var vids = (t.artifacts && t.artifacts.videos) || [];
      for (var j = 0; j < vids.length; j++) {
        allItems.push({ src: vids[j], testName: t.title || t.fullName, file: t.file || '', status: t.status });
      }
    }
    if (allItems.length === 0) {
      container.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">\\ud83c\\udfac</div><div class="empty-state-title">No videos</div><div class="empty-state-msg">No test videos were captured in this run.</div></div>';
      return;
    }
    container.innerHTML = allItems.map(function(item) {
      var ns = item.status === 'timedOut' ? 'failed' : item.status;
      return '<div class="media-card">' +
        '<video src="' + escHtml(normalizeMediaPath(item.src)) + '" controls preload="metadata"></video>' +
        '<div class="media-card-info">' +
          '<div class="media-card-title"><span class="status-icon ' + statusClass(ns) + '" style="margin-right:4px;font-size:0.65rem">' + statusSymbol(ns) + '</span>' + escHtml(item.testName) + '</div>' +
          '<div class="media-card-sub">' + escHtml(item.file) + '</div>' +
        '</div></div>';
    }).join('');
  }

  function renderTabs() {
    const failedCount = tests.filter(t => t.status === "failed" || t.status === "timedOut").length;
    const ssCount = countAllScreenshots();
    const vidCount = countAllVideos();
    const tabs = [
      { id: "all", label: "All Features", count: tests.length },
      { id: "failed", label: "Failed", count: failedCount },
      { id: "passed", label: "Passed", count: tests.filter(t => t.status === "passed").length },
      { id: "skipped", label: "Skipped", count: tests.filter(t => t.status === "skipped").length },
      { id: "slow", label: "Slowest", count: Math.min(10, tests.length) },
      { id: "screenshots", label: "\\ud83d\\udcf8 Screenshots", count: ssCount },
      { id: "videos", label: "\\ud83c\\udfac Videos", count: vidCount },
      { id: "healing", label: "\\ud83e\\ude79 Healing", count: healingPayloads.length }
    ];
    document.getElementById("mainTabs").innerHTML = tabs.map((tab, idx) =>
      '<button class="tab-btn ' + (idx === 0 ? "active" : "") + '" data-tab="' + tab.id + '">' +
      tab.label + ' <span class="tab-count">' + tab.count + '</span></button>'
    ).join("");
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('tab-' + btn.getAttribute('data-tab')).classList.add('active');
        btn.classList.add('active');
      });
    });
  }

  function renderExecutiveSummary() {
    var section = document.getElementById('exec-summary-section');
    if (!section) return;
    var total = summary.total || 0;
    var passed = summary.passed || 0;
    var failed = (summary.failed || 0) + (summary.timedOut || 0);
    var skipped = summary.skipped || 0;
    var flaky = summary.flaky || 0;
    var pct = total > 0 ? Math.round((passed / total) * 100) : 0;
    var avgMs = summary.averageDurationMs || (total > 0 ? Math.round((summary.durationMs || 0) / total) : 0);

    var healthClass = 'exec-health-good';
    var healthText = 'Healthy';
    if (pct < 70) { healthClass = 'exec-health-bad'; healthText = 'Critical'; }
    else if (pct < 90 || flaky > 0) { healthClass = 'exec-health-warn'; healthText = 'Needs Attention'; }

    var narrative = 'This test run executed <strong>' + total + '</strong> test' + (total !== 1 ? 's' : '') + ' in <strong>' + formatMs(summary.durationMs || 0) + '</strong>. ';
    if (failed === 0) { narrative += 'All tests passed successfully \\u2014 the suite is in good health.'; }
    else { narrative += '<strong>' + failed + '</strong> test' + (failed !== 1 ? 's' : '') + ' failed, resulting in a <strong>' + pct + '%</strong> pass rate.'; }
    if (flaky > 0) { narrative += ' <strong>' + flaky + '</strong> flaky test' + (flaky !== 1 ? 's were' : ' was') + ' detected.'; }

    var failedTests = tests.filter(function(t) { return t.status === 'failed' || t.status === 'timedOut'; }).slice(0, 5);
    var failuresHtml = '';
    if (failedTests.length > 0) {
      failuresHtml = '<div style="margin-top:0.5rem"><div style="font-size:0.72rem;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.35rem">Top Failures</div>' +
        '<ul class="exec-top-failures">' +
        failedTests.map(function(t) {
          return '<li><span class="status-icon status-failed-icon" style="font-size:0.65rem">\\u2717</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(t.title || t.fullName) + '</span></li>';
        }).join('') +
        '</ul></div>';
    }

    section.innerHTML =
      '<div class="section-header"><div class="section-title">Executive Summary</div><span class="exec-health-indicator ' + healthClass + '">' + healthText + '</span></div>' +
      '<div class="exec-summary">' +
        '<div class="exec-left">' +
          '<div class="exec-narrative">' + narrative + '</div>' +
          failuresHtml +
        '</div>' +
        '<div class="exec-right">' +
          '<div class="exec-metric"><div class="exec-metric-value" style="color:var(--pass)">' + pct + '%</div><div class="exec-metric-label">Pass Rate</div></div>' +
          '<div class="exec-metric"><div class="exec-metric-value">' + formatMs(avgMs) + '</div><div class="exec-metric-label">Avg Duration</div></div>' +
          '<div class="exec-metric"><div class="exec-metric-value" style="color:var(--fail)">' + failed + '</div><div class="exec-metric-label">Failures</div></div>' +
          (flaky > 0 ? '<div class="exec-metric"><div class="exec-metric-value" style="color:var(--flaky)">' + flaky + '</div><div class="exec-metric-label">Flaky</div></div>' : '') +
        '</div>' +
      '</div>';
  }

  function renderHealing() {
    var el = document.getElementById('healingContainer');
    if (!el) return;
    if (!healingPayloads || healingPayloads.length === 0) {
      var healingMsg;
      if (aiEnabled && aiAnalyses.length > 0) {
        healingMsg = 'AI analysis ran successfully. Add <code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:4px">healing: { enabled: true }</code> to your reporter config to generate healing suggestions.';
      } else if (aiEnabled) {
        healingMsg = 'AI analysis needs to run successfully first. Check that your API key is set and tests have failures to analyze.';
      } else {
        healingMsg = 'Enable AI analysis to generate healing suggestions for failed tests.';
      }
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">\\ud83e\\ude79</div><div class="empty-state-title">No healing suggestions</div><div class="empty-state-msg">' + healingMsg + '</div></div>';
      return;
    }
    var cardsHtml = healingPayloads.map(function(p) {
      var confPct = Math.round((p.confidence || 0) * 100);
      var confColor = confPct >= 70 ? 'var(--pass)' : confPct >= 40 ? 'var(--flaky)' : 'var(--fail)';
      var patchHtml = p.suggestedPatch
        ? '<div style="margin-top:0.6rem"><div style="font-size:0.68rem;font-weight:700;color:var(--text3);margin-bottom:0.3rem;text-transform:uppercase;letter-spacing:0.06em">Suggested Patch</div>' +
          '<pre style="font-size:0.7rem;background:#0d1117;padding:0.55rem 0.75rem;border-radius:6px;border:1px solid var(--border);color:#a5d6ff;white-space:pre-wrap;word-break:break-word;font-family:var(--font-mono)">' + escHtml(p.suggestedPatch) + '</pre></div>'
        : '';
      var locatorsHtml = (p.candidateLocators && p.candidateLocators.length > 0)
        ? '<div style="margin-top:0.38rem;font-size:0.71rem;color:var(--text3)"><span style="font-weight:600">Candidates:</span> ' +
          p.candidateLocators.map(function(l) { return '<code style="background:var(--bg);padding:1px 6px;border-radius:4px;font-size:0.68rem;font-family:var(--font-mono);color:var(--accent)">' + escHtml(l) + '</code>'; }).join(' \\u00b7 ') + '</div>'
        : '';
      return '<div style="background:var(--bg3);border-radius:var(--radius-sm);padding:0.9rem 1.05rem;border:1px solid var(--border)">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:0.4rem">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:0.83rem;font-weight:700;color:var(--text1);margin-bottom:0.12rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(p.testName) + '</div>' +
            '<div style="font-size:0.69rem;color:var(--text3);font-family:var(--font-mono)">' + escHtml(p.file) + (p.stepName ? ' \\u00b7 ' + escHtml(p.stepName) : '') + '</div>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">' +
            '<span class="badge badge-neutral">' + escHtml(p.actionType || 'investigate') + '</span>' +
            '<span style="font-size:0.74rem;font-weight:700;color:' + confColor + '">' + confPct + '%</span>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:0.79rem;color:var(--text2);line-height:1.6;margin-bottom:0.32rem">' + escHtml(p.reasoning) + '</div>' +
        locatorsHtml + patchHtml +
        '</div>';
    }).join('');

    var mdSection = '';
    if (healingMarkdown) {
      mdSection = '<div style="background:var(--bg3);border-radius:var(--radius-sm);padding:0.9rem 1.05rem;border:1px solid var(--border)">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:0.5rem">' +
          '<div style="font-size:0.83rem;font-weight:700;color:var(--text1)">\\ud83d\\udcc4 healing.md</div>' +
          '<button id="healingMdToggle" class="btn-sm" style="font-size:0.68rem;padding:2px 9px">Show</button>' +
          '<button id="healingMdDownload" class="btn-sm btn-accent" style="font-size:0.68rem;padding:2px 9px">\\u2193 Download</button>' +
        '</div>' +
        '<pre id="healingMdContent" class="healing-md-pre">' + escHtml(healingMarkdown) + '</pre>' +
      '</div>';
    }
    el.innerHTML = '<div style="display:flex;flex-direction:column;gap:0.55rem">' + cardsHtml + mdSection + '</div>';

    var toggleBtn = document.getElementById('healingMdToggle');
    var dlBtn = document.getElementById('healingMdDownload');
    var mdPre = document.getElementById('healingMdContent');
    if (toggleBtn && mdPre) {
      toggleBtn.addEventListener('click', function() {
        var visible = window.getComputedStyle(mdPre).display !== 'none';
        mdPre.style.display = visible ? 'none' : 'block';
        toggleBtn.textContent = visible ? 'Show' : 'Hide';
      });
    }
    if (dlBtn) {
      dlBtn.addEventListener('click', function() {
        var blob = new Blob([healingMarkdown], { type: 'text/markdown' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a'); a.href = url; a.download = 'healing.md';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }
  }

  function timeAgo(iso) {
    if (!iso) return '';
    var diff = Date.now() - new Date(iso).getTime();
    var secs = Math.floor(diff / 1000);
    if (secs < 60) return secs + 's ago';
    var mins = Math.floor(secs / 60);
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    var days = Math.floor(hrs / 24);
    return days + 'd ago';
  }

  function renderSparkline(values, color, areaColor) {
    if (!values || values.length < 2) {
      if (values && values.length === 1) {
        return '<svg class="sparkline" viewBox="0 0 100 44" preserveAspectRatio="none"><circle cx="50" cy="22" r="3" fill="' + color + '"></circle></svg>';
      }
      return '<svg class="sparkline" viewBox="0 0 100 44" preserveAspectRatio="none"><line x1="0" y1="22" x2="100" y2="22" stroke="' + color + '" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.3"></line></svg>';
    }
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var range = max - min || 1;
    var pad = 5;
    var w = 100, h = 44;
    var pts = values.map(function(v, i) {
      var x = values.length === 1 ? w / 2 : (i / (values.length - 1)) * (w - pad * 2) + pad;
      var y = h - pad - ((v - min) / range) * (h - pad * 2);
      return [x, y];
    });
    var pathD = pts.map(function(p, i) { return (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    var areaD = pathD + ' L' + pts[pts.length - 1][0].toFixed(1) + ',' + (h - pad) + ' L' + pts[0][0].toFixed(1) + ',' + (h - pad) + ' Z';
    var lastPt = pts[pts.length - 1];
    return '<svg class="sparkline" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<path class="sparkline-area" d="' + areaD + '" fill="' + (areaColor || color) + '"></path>' +
      '<path class="sparkline-line" d="' + pathD + '" stroke="' + color + '"></path>' +
      '<circle class="sparkline-dot" cx="' + lastPt[0].toFixed(1) + '" cy="' + lastPt[1].toFixed(1) + '" fill="' + color + '"></circle>' +
      '</svg>';
  }

  function renderTrends() {
    var runs = historyRuns;
    var subtitleEl = document.getElementById('trends-subtitle');
    if (subtitleEl) {
      subtitleEl.textContent = runs.length + ' run' + (runs.length !== 1 ? 's' : '') + ' in history';
    }

    // No data state
    if (runs.length === 0) {
      var chartsRow = document.getElementById('trends-charts-row');
      if (chartsRow) chartsRow.innerHTML = '<div class="trends-no-data" style="grid-column:1/-1"><div class="trends-no-data-icon">\\ud83d\\udcc8</div><div style="font-size:0.85rem;font-weight:700;color:var(--text1);margin-bottom:0.3rem">No history yet</div><div>Run your tests a few times to see trends, regressions, and performance analytics here.</div></div>';
      ['trends-regression-list','trends-perf-list','trends-run-table'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = '<div class="trends-empty">No data yet.</div>';
      });
      return;
    }

    // --- Charts ---
    var passRates = runs.map(function(r) { return r.passRate || 0; });
    var durations = runs.map(function(r) { return (r.summary && r.summary.durationMs) ? Math.round(r.summary.durationMs / 1000) : 0; });
    var failures = runs.map(function(r) { return (r.summary && r.summary.failed) ? r.summary.failed : 0; });

    var latestPassRate = passRates[passRates.length - 1];
    var prevPassRate = passRates.length >= 2 ? passRates[passRates.length - 2] : null;
    var passRateDelta = prevPassRate !== null ? latestPassRate - prevPassRate : 0;

    var latestDur = durations[durations.length - 1];
    var prevDur = durations.length >= 2 ? durations[durations.length - 2] : null;
    var durDelta = prevDur !== null ? latestDur - prevDur : 0;

    var latestFails = failures[failures.length - 1];
    var prevFails = failures.length >= 2 ? failures[failures.length - 2] : null;
    var failsDelta = prevFails !== null ? latestFails - prevFails : 0;

    function deltaHtml(delta, invert) {
      if (delta === 0) return '<span class="trends-chart-delta neutral">\\u2192 no change</span>';
      var up = delta > 0;
      var good = invert ? !up : up;
      var cls = good ? 'up' : 'down';
      var arrow = up ? '\\u2191' : '\\u2193';
      return '<span class="trends-chart-delta ' + cls + '">' + arrow + ' ' + Math.abs(delta) + (typeof delta === 'number' && !Number.isInteger(delta) ? '' : '') + ' vs prev run</span>';
    }

    var chartsHtml =
      '<div class="trends-chart-card">' +
        '<div class="trends-chart-label">\\u2705 Pass Rate</div>' +
        '<div class="trends-chart-current" style="color:' + (latestPassRate >= 80 ? 'var(--pass)' : latestPassRate >= 50 ? 'var(--flaky)' : 'var(--fail)') + '">' + latestPassRate + '%</div>' +
        deltaHtml(passRateDelta, false) +
        renderSparkline(passRates, 'var(--pass)', '#10b981') +
      '</div>' +
      '<div class="trends-chart-card">' +
        '<div class="trends-chart-label">\\u274c Failures</div>' +
        '<div class="trends-chart-current" style="color:' + (latestFails === 0 ? 'var(--pass)' : 'var(--fail)') + '">' + latestFails + '</div>' +
        deltaHtml(failsDelta, true) +
        renderSparkline(failures, 'var(--fail)', '#ef4444') +
      '</div>' +
      '<div class="trends-chart-card">' +
        '<div class="trends-chart-label">\\u23f1 Duration (s)</div>' +
        '<div class="trends-chart-current">' + latestDur + 's</div>' +
        deltaHtml(durDelta, true) +
        renderSparkline(durations, 'var(--accent)', '#a5b0ff') +
      '</div>';
    var chartsRow = document.getElementById('trends-charts-row');
    if (chartsRow) chartsRow.innerHTML = chartsHtml;

    // --- Regressions ---
    var regressionItems = [];
    if (runs.length >= 2) {
      var curRun = runs[runs.length - 1];
      var prevRun = runs[runs.length - 2];
      var curMap = {};
      (curRun.testSnapshots || []).forEach(function(s) { curMap[s.key] = s; });
      var prevMap = {};
      (prevRun.testSnapshots || []).forEach(function(s) { prevMap[s.key] = s; });
      // Check all tests in current run
      Object.keys(curMap).forEach(function(key) {
        var cur = curMap[key];
        var prev = prevMap[key];
        var curFailed = cur.status === 'failed' || cur.status === 'timedOut';
        var prevFailed = prev && (prev.status === 'failed' || prev.status === 'timedOut');
        var prevPassed = prev && prev.status === 'passed';
        if (curFailed && prevPassed) {
          regressionItems.push({ key, status: 'regressed', cur, prev });
        } else if (curFailed && !prev) {
          regressionItems.push({ key, status: 'new_fail', cur, prev: null });
        } else if (!curFailed && prevFailed) {
          regressionItems.push({ key, status: 'recovered', cur, prev });
        }
      });
      regressionItems.sort(function(a, b) {
        var order = { regressed: 0, new_fail: 1, recovered: 2 };
        return (order[a.status] || 0) - (order[b.status] || 0);
      });
    }
    var regressionEl = document.getElementById('trends-regression-list');
    if (regressionEl) {
      if (regressionItems.length === 0) {
        regressionEl.innerHTML = '<div class="trends-empty">\\u2705 No regressions detected between the last two runs.</div>';
      } else {
        regressionEl.innerHTML = regressionItems.slice(0, 20).map(function(item) {
          var badgeCls = item.status === 'regressed' ? 'trend-badge-regressed' : item.status === 'recovered' ? 'trend-badge-recovered' : 'trend-badge-new-fail';
          var badgeLabel = item.status === 'regressed' ? '\\u2193 Regressed' : item.status === 'recovered' ? '\\u2191 Recovered' : '\\u26a0 New Failure';
          var parts = item.key.split('::');
          var file = parts[0] || '';
          var name = parts.slice(1).join('::') || item.key;
          return '<div class="trends-regression-item">' +
            '<div style="display:flex;align-items:center;gap:6px">' +
              '<span class="trends-regression-badge ' + badgeCls + '">' + badgeLabel + '</span>' +
              '<span class="trends-regression-name">' + escHtml(name) + '</span>' +
            '</div>' +
            '<div class="trends-regression-meta">' + escHtml(file) + '</div>' +
          '</div>';
        }).join('');
      }
    }

    // --- Performance changes ---
    var perfItems = [];
    if (runs.length >= 3) {
      var latest = runs[runs.length - 1];
      var baseline = runs.slice(-Math.min(runs.length - 1, 5), -1);
      var baseMap = {};
      baseline.forEach(function(run) {
        (run.testSnapshots || []).forEach(function(s) {
          if (!baseMap[s.key]) baseMap[s.key] = [];
          baseMap[s.key].push(s.durationMs || 0);
        });
      });
      (latest.testSnapshots || []).forEach(function(s) {
        var hist = baseMap[s.key];
        if (!hist || hist.length === 0) return;
        var avg = hist.reduce(function(a, b) { return a + b; }, 0) / hist.length;
        if (avg < 200) return; // skip very fast tests
        var ratio = (s.durationMs - avg) / avg;
        if (Math.abs(ratio) >= 0.5) {
          perfItems.push({ key: s.key, current: s.durationMs, avg: Math.round(avg), ratio });
        }
      });
      perfItems.sort(function(a, b) { return Math.abs(b.ratio) - Math.abs(a.ratio); });
    }
    var perfEl = document.getElementById('trends-perf-list');
    if (perfEl) {
      if (perfItems.length === 0) {
        var msg = runs.length < 3
          ? '<div class="trends-empty">Need at least 3 runs for performance baselines.</div>'
          : '<div class="trends-empty">\\u2705 No significant performance changes detected.</div>';
        perfEl.innerHTML = msg;
      } else {
        perfEl.innerHTML = perfItems.slice(0, 15).map(function(item) {
          var slower = item.ratio > 0;
          var pct = Math.round(Math.abs(item.ratio) * 100);
          var badgeCls = slower ? 'trend-badge-regressed' : 'trend-badge-recovered';
          var label = (slower ? '\\u2191 ' : '\\u2193 ') + pct + '% ' + (slower ? 'slower' : 'faster');
          var parts = item.key.split('::');
          var file = parts[0] || '';
          var name = parts.slice(1).join('::') || item.key;
          return '<div class="trends-regression-item">' +
            '<div style="display:flex;align-items:center;gap:6px">' +
              '<span class="trends-regression-badge ' + badgeCls + '">' + label + '</span>' +
              '<span class="trends-regression-name">' + escHtml(name) + '</span>' +
            '</div>' +
            '<div class="trends-regression-meta">' + escHtml(file) + ' \\u00b7 ' + formatMs(item.current) + ' vs avg ' + formatMs(item.avg) + '</div>' +
          '</div>';
        }).join('');
      }
    }

    // --- Run history table ---
    var tableEl = document.getElementById('trends-run-table');
    if (tableEl) {
      var displayRuns = runs.slice().reverse().slice(0, 25);
      var maxDur = Math.max.apply(null, displayRuns.map(function(r) { return (r.summary && r.summary.durationMs) || 0; })) || 1;
      tableEl.innerHTML = '<table class="trends-run-table"><thead><tr>' +
        '<th>When</th><th>Branch / Commit</th><th>Pass Rate</th><th>Total</th><th>Fail</th><th>Flaky</th><th>Duration</th><th>PW</th>' +
        '</tr></thead><tbody>' +
        displayRuns.map(function(r) {
          var pct = r.passRate || 0;
          var barW = Math.round(pct * 0.6);
          var barColor = pct >= 80 ? 'var(--pass)' : pct >= 50 ? 'var(--flaky)' : 'var(--fail)';
          var branchLabel = r.branch ? escHtml(r.branch.slice(0, 24)) : '\\u2014';
          var commitLabel = r.commit ? '<code style="font-size:0.66rem;color:var(--accent);font-family:var(--font-mono)">' + escHtml(r.commit) + '</code>' : '';
          return '<tr>' +
            '<td style="white-space:nowrap">' + timeAgo(r.timestamp) + '<br><span style="font-size:0.63rem;color:var(--text3)">' + (r.timestamp ? new Date(r.timestamp).toLocaleDateString() : '') + '</span></td>' +
            '<td>' + branchLabel + (commitLabel ? '<br>' + commitLabel : '') + '</td>' +
            '<td><span class="trend-pass-rate-bar" style="width:' + barW + 'px;background:' + barColor + '"></span>' +
              '<span style="font-size:0.75rem;font-weight:700;color:' + barColor + '">' + pct + '%</span></td>' +
            '<td>' + ((r.summary && r.summary.total) || 0) + '</td>' +
            '<td style="color:' + ((r.summary && r.summary.failed) ? 'var(--fail)' : 'var(--text3)') + '">' + ((r.summary && r.summary.failed) || 0) + '</td>' +
            '<td style="color:' + ((r.summary && r.summary.flaky) ? 'var(--flaky)' : 'var(--text3)') + '">' + ((r.summary && r.summary.flaky) || 0) + '</td>' +
            '<td style="font-family:var(--font-mono);font-size:0.72rem">' + formatMs((r.summary && r.summary.durationMs) || 0) + '</td>' +
            '<td style="color:var(--text3);font-size:0.69rem">' + escHtml(r.playwrightVersion || '\\u2014') + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table>';
    }
  }

  function renderFooter() {
    document.getElementById('footer').innerHTML =
      '<div>Generated by <a class="footer-link" href="https://github.com/pankajnakhat/playwright-spec-doc-reporter" target="_blank" rel="noreferrer">playwright-spec-doc-reporter</a></div>' +
      '<div>' + new Date(report.generatedAt).toLocaleString() + ' \\u00b7 ' + tests.length + ' tests \\u00b7 ' + formatMs(summary.durationMs || 0) + '</div>';
  }
`;
}
