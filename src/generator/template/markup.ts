export function getMarkup(): string {
  return `
<div class="topbar">
  <div class="topbar-brand">
    <div class="topbar-logo">&#127917;</div>
    <span id="brand-title"></span>
  </div>
  <div class="topbar-right">
    <div class="topbar-meta">
      <span class="topbar-meta-item" id="meta-time"></span>
      <span class="topbar-meta-item" id="meta-duration"></span>
      <span class="topbar-meta-item" style="color:var(--text3)">Playwright Reporter</span>
    </div>
    <button class="btn-theme-toggle" id="btnThemeToggle" title="Toggle light/dark theme">&#9728;&#65039;</button>
    <button class="btn-sm" id="btnExportPdf">&#128438; Print</button>
  </div>
</div>

<div id="failure-banner" class="failure-banner">
  <div class="failure-banner-msg" id="banner-msg"></div>
  <button class="failure-banner-btn" onclick="jumpToFailed()">View failures &#8594;</button>
</div>

<nav class="page-nav" id="pageNav">
  <button class="page-nav-btn active" data-page="overview">&#128202; Overview</button>
  <button class="page-nav-btn" data-page="tests">&#129514; Tests</button>
  <button class="page-nav-btn" data-page="ai">&#129302; AI Insights</button>
  <button class="page-nav-btn" data-page="trends">&#128200; Trends</button>
  <button class="page-nav-btn" data-page="docs">&#128203; Docs</button>
</nav>

<div class="container">

  <!-- Overview Page -->
  <div class="page-panel active" id="page-overview">
    <div class="hero">
      <div class="hero-left">
        <div class="hero-title" id="hero-title"></div>
        <div class="hero-subtitle" id="hero-subtitle"></div>
        <div class="hero-status" id="hero-status"></div>
        <div class="env-row" id="env-row"></div>
      </div>
      <div class="donut-wrap">
        <svg width="130" height="130" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border2)" stroke-width="10"></circle>
          <circle id="donut-pass" cx="60" cy="60" r="54" fill="none" stroke="var(--pass)" stroke-width="10" stroke-linecap="round" stroke-dasharray="0" stroke-dashoffset="0"></circle>
        </svg>
        <div class="donut-center">
          <div class="donut-pct" id="donut-pct">0%</div>
          <div class="donut-label">passed</div>
        </div>
      </div>
    </div>

    <div class="progress-section">
      <div class="progress-stack" id="progress-stack"></div>
      <div class="progress-labels" id="progress-labels"></div>
    </div>

    <div class="stats-grid" id="stats-grid"></div>

    <div class="bdd-summary-bar" id="bdd-summary"></div>

    <section class="section" id="exec-summary-section"></section>
  </div>

  <!-- Tests Page -->
  <div class="page-panel" id="page-tests">
    <div class="section">
      <div class="section-header">
        <div class="section-title">Features &amp; Scenarios</div>
        <div class="section-actions">
          <button class="btn-sm" onclick="expandAllSuites()">Expand All</button>
          <button class="btn-sm" onclick="collapseAllSuites()">Collapse All</button>
        </div>
      </div>
      <div class="tabs" id="mainTabs"></div>

      <div class="tab-panel active" id="tab-all">
        <div class="filter-bar">
          <div class="search-wrap">
            <span class="search-icon">&#128269;</span>
            <input class="search-input" id="search-input" type="text" placeholder="Search tests by name, file, tag, or error...">
            <span class="search-result-count" id="search-result-count"></span>
          </div>
          <div class="filter-group">
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="passed">&#10003; Pass</button>
            <button class="filter-btn" data-filter="failed">&#10007; Fail</button>
            <button class="filter-btn" data-filter="skipped">&#8212; Skip</button>
          </div>
          <div class="filter-divider"></div>
          <div class="filter-group" id="typeFilterGroup"></div>
          <div class="filter-divider" id="tagFilterDivider" style="display:none"></div>
          <div class="filter-group tag-filter-group" id="tagFilterGroup"></div>
        </div>
        <div class="suites-container" id="suitesContainer"></div>
      </div>

      <div class="tab-panel" id="tab-failed"><div class="suites-container" id="failedContainer"></div></div>
      <div class="tab-panel" id="tab-passed"><div class="suites-container" id="passedContainer"></div></div>
      <div class="tab-panel" id="tab-skipped"><div class="suites-container" id="skippedContainer"></div></div>
      <div class="tab-panel" id="tab-slow"><div class="slow-list" id="slowContainer"></div></div>
      <div class="tab-panel" id="tab-screenshots"><div class="media-grid" id="screenshotsContainer"></div></div>
      <div class="tab-panel" id="tab-videos"><div class="media-grid" id="videosContainer"></div></div>
      <div class="tab-panel" id="tab-healing"><div id="healingContainer" style="padding:0.75rem"></div></div>
    </div>
  </div>

  <!-- AI Insights Page -->
  <div class="page-panel" id="page-ai">
    <section class="section" id="ai-section"></section>
  </div>

  <!-- Trends Page -->
  <div class="page-panel" id="page-trends">
    <div class="trends-header">
      <div class="trends-header-left">
        <div class="trends-title">&#128200; Run History &amp; Trends</div>
        <div class="trends-subtitle" id="trends-subtitle"></div>
      </div>
      <div class="trends-header-right" id="trends-header-actions"></div>
    </div>
    <div class="trends-charts-row" id="trends-charts-row"></div>
    <div class="trends-tables-row">
      <div class="trends-table-card" id="trends-regression-card">
        <div class="trends-card-title">&#128683; Regressions</div>
        <div id="trends-regression-list"></div>
      </div>
      <div class="trends-table-card" id="trends-perf-card">
        <div class="trends-card-title">&#9201; Performance Changes</div>
        <div id="trends-perf-list"></div>
      </div>
    </div>
    <div class="trends-history-card" id="trends-history-card">
      <div class="trends-card-title">&#128196; Run History</div>
      <div id="trends-run-table"></div>
    </div>
  </div>

  <!-- Docs Page -->
  <div class="page-panel" id="page-docs">
    <div class="section">

      <div class="docs-toolbar">
        <div class="docs-toolbar-left">
          <span class="docs-toolbar-label">Status</span>
          <div class="filter-group">
            <button class="filter-btn active" data-doc-status="all">All</button>
            <button class="filter-btn" data-doc-status="passed">&#10003; Passed</button>
            <button class="filter-btn" data-doc-status="failed">&#10007; Failed</button>
          </div>
          <div class="docs-feature-dropdown" id="docsFeatureDropdownWrap">
            <button class="btn-sm docs-feature-trigger" id="docsFeatureTrigger">
              &#128203; Features <span class="docs-feature-count" id="docsFeatureCount"></span> &#9660;
            </button>
            <div class="docs-feature-panel" id="docsFeaturePanel">
              <div class="docs-feature-panel-hdr">
                <span style="font-size:0.72rem;font-weight:700;color:var(--text2)">Filter features</span>
                <div style="display:flex;gap:4px">
                  <button class="btn-sm" id="docSelectAll" style="padding:2px 8px;font-size:0.68rem">All</button>
                  <button class="btn-sm" id="docSelectNone" style="padding:2px 8px;font-size:0.68rem">None</button>
                </div>
              </div>
              <div class="doc-feature-checks" id="docFeatureFilter"></div>
            </div>
          </div>
        </div>
        <div class="docs-toolbar-right">
          <div class="doc-view-tabs">
            <button class="doc-tab-btn active" data-doc-tab="md">&#128196; Markdown</button>
            <button class="doc-tab-btn" data-doc-tab="html">&#127760; Preview</button>
          </div>
          <button class="btn-sm" id="docCopyBtn">&#128203; Copy</button>
          <button class="btn-sm" id="docDownloadMdBtn">&#8595; .md</button>
          <button class="btn-sm" id="docDownloadHtmlBtn">&#8595; .html</button>
          <button class="btn-sm btn-accent" id="docExportPdfBtn">&#128438; PDF</button>
        </div>
      </div>

      <div class="doc-page-body">
        <div class="doc-tab-panel active" id="doc-tab-md">
          <pre id="docMarkdownContent" class="doc-pre"></pre>
        </div>
        <div class="doc-tab-panel" id="doc-tab-html">
          <iframe id="docHtmlPreview" class="doc-iframe" title="HTML Documentation Preview"></iframe>
        </div>
      </div>

    </div>
  </div>

  <div class="footer" id="footer"></div>
</div>

<button class="scroll-top" id="scrollTopBtn" title="Back to top">&#8593;</button>

<div class="gallery-overlay" id="galleryOverlay">
  <div class="gallery-panel" role="dialog" aria-modal="true" aria-label="Screenshot gallery">
    <div class="gallery-head">
      <div class="gallery-head-left">
        <span id="galleryTitle">Gallery</span>
        <span id="galleryCounter" style="color:var(--text3)">1 / 1</span>
      </div>
      <button class="gallery-close-btn" id="galleryClose" title="Close (Esc)">&#10005;</button>
    </div>
    <div class="gallery-body">
      <img class="gallery-image" id="galleryImage" alt="Screenshot" />
      <video class="gallery-video" id="galleryVideo" controls preload="metadata"></video>
    </div>
    <div class="gallery-controls">
      <button class="gallery-btn" id="galleryPrev">&#8592; Prev</button>
      <button class="gallery-btn" id="galleryPlay">&#9654; Play</button>
      <button class="gallery-btn" id="galleryNext">Next &#8594;</button>
    </div>
    <div class="gallery-hint">&#8592; &#8594; keys to navigate &#183; Esc to close</div>
  </div>
</div>

`;
}
