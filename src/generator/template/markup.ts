export function getMarkup(): string {
  return `
<div class="topbar">
  <div class="topbar-brand">
    <div class="topbar-logo">&#127917;</div>
    <div class="topbar-brand-text">
      <span id="brand-title"></span>
      <span class="topbar-brand-subtitle">Spec Documentation</span>
    </div>
  </div>
  <div class="topbar-right">
    <div class="topbar-meta">
      <span class="topbar-meta-item" id="meta-time"></span>
      <span class="topbar-meta-sep"></span>
      <span class="topbar-meta-item" id="meta-duration"></span>
    </div>
    <button class="btn-theme-toggle" id="btnThemeToggle" title="Toggle light/dark theme">&#9728;&#65039;</button>
    <button class="btn-sm btn-share" id="btnShare">&#128279; Share</button>
    <button class="btn-sm btn-export" id="btnExportPdf">&#11014; Export</button>
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
  <button class="page-nav-btn" id="navTraceability" data-page="traceability">&#128279; Traceability</button>
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

    <div class="stats-grid" id="stats-grid"></div>

    <div class="progress-section">
      <div class="progress-stack" id="progress-stack"></div>
      <div class="progress-labels" id="progress-labels"></div>
    </div>

    <section class="section" id="test-health-section" style="margin-bottom:1rem"></section>

    <div class="bdd-summary-bar" id="bdd-summary"></div>

    <section class="section" id="healer-activity-section"></section>

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
            <button class="filter-btn filter-btn-pass" data-filter="passed">PASSED</button>
            <button class="filter-btn filter-btn-fail" data-filter="failed">FAILED</button>
            <button class="filter-btn filter-btn-skip" data-filter="skipped">SKIPPED</button>
            <button class="filter-btn filter-btn-flaky" data-filter="flaky">FLAKY</button>
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
    <div id="ai-insight-header"></div>
    <section class="section" id="ai-section"></section>
  </div>

  <!-- Trends Page -->
  <div class="page-panel" id="page-trends">
    <div class="trends-header">
      <div class="trends-header-left">
        <div class="trends-page-title">Run History &amp; Trends</div>
        <div class="trends-page-subtitle" id="trends-subtitle">Analyzing patterns across recent test runs</div>
      </div>
      <div class="trends-header-right" id="trends-header-actions">
        <button class="btn-sm" id="btnExportTrends">&#11014; Export Report</button>
      </div>
    </div>
    <div class="trends-charts-row" id="trends-charts-row"></div>
    <div class="trends-history-card" id="trends-rootcause-card">
      <div class="trends-card-title">&#128269; Root-Cause Trends</div>
      <div id="trends-rootcause-body"></div>
    </div>
    <div class="trends-tables-row">
      <div class="trends-table-card" id="trends-regression-card">
        <div class="trends-card-title trends-card-title-fail">&#128683; Test Regressions</div>
        <div id="trends-regression-list"></div>
      </div>
      <div class="trends-table-card" id="trends-perf-card">
        <div class="trends-card-title trends-card-title-warn">&#9201; Performance Changes</div>
        <div id="trends-perf-list"></div>
      </div>
    </div>
    <div class="trends-history-card" id="trends-history-card">
      <div class="trends-card-title">&#10022; Recent Test Runs</div>
      <div id="trends-run-table"></div>
    </div>
  </div>

  <!-- Docs Page -->
  <div class="page-panel" id="page-docs">
    <!-- Docs toolbar: features count + format + view toggle -->
    <div class="docs-new-toolbar">
      <div class="docs-new-toolbar-left">
        <span class="docs-toolbar-section-label">FEATURES</span>
        <span class="docs-features-badge" id="docsFeatureCount">0 selected</span>
        <div class="docs-toolbar-sep"></div>
        <span class="docs-toolbar-section-label">FORMAT</span>
        <div class="docs-format-group" id="docsFormatGroup">
          <button class="docs-fmt-btn active" data-doc-tab="md">&#128196; Markdown</button>
          <button class="docs-fmt-btn" data-doc-tab="html">&#127760; HTML</button>
          <button class="docs-fmt-btn" data-doc-tab="json" style="display:none">&#123;&#125; JSON</button>
        </div>
        <div class="docs-toolbar-sep"></div>
        <div class="docs-view-group">
          <button class="docs-view-btn active" data-doc-view="source">&#60;/&#62; Source</button>
          <button class="docs-view-btn" data-doc-view="preview">&#128065; Preview</button>
        </div>
      </div>
      <!-- Hidden elements for JS compatibility -->
      <div style="display:none">
        <div class="doc-view-tabs">
          <button class="doc-tab-btn active" data-doc-tab="md">Markdown</button>
          <button class="doc-tab-btn" data-doc-tab="html">Preview</button>
        </div>
        <button id="docCopyBtn"></button>
        <button id="docDownloadMdBtn"></button>
        <button id="docDownloadHtmlBtn"></button>
        <button id="docExportPdfBtn"></button>
        <div id="docs-header-actions"></div>
        <div id="docs-format-actions"></div>
        <div class="docs-feature-dropdown" id="docsFeatureDropdownWrap">
          <button class="btn-sm docs-feature-trigger" id="docsFeatureTrigger"></button>
          <div class="docs-feature-panel" id="docsFeaturePanel">
            <div class="docs-feature-panel-hdr">
              <div style="display:flex;gap:4px">
                <button class="btn-sm" id="docSelectAll">All</button>
                <button class="btn-sm" id="docSelectNone">None</button>
              </div>
            </div>
            <div class="doc-feature-checks" id="docFeatureFilter"></div>
          </div>
        </div>
        <div class="docs-toolbar">
          <div class="docs-toolbar-left">
            <div class="filter-group">
              <button class="filter-btn active" data-doc-status="all">All</button>
              <button class="filter-btn" data-doc-status="passed">Passed</button>
              <button class="filter-btn" data-doc-status="failed">Failed</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Document area -->
    <div class="docs-doc-area">
      <div class="docs-doc-header">
        <div class="docs-doc-header-left">
          <span class="docs-doc-format-badge" id="docsDocFormatBadge">&#128196; MARKDOWN Document</span>
        </div>
        <button class="btn-sm btn-export" id="docDownloadMdBtnHdr">&#11014; Export</button>
        <button class="btn-sm" id="docDownloadHtmlBtnHdr" style="display:none">&#11014; Export HTML</button>
      </div>
      <div class="doc-tab-panel active" id="doc-tab-md">
        <pre id="docMarkdownContent" class="doc-pre docs-pre-new"></pre>
      </div>
      <div class="doc-tab-panel" id="doc-tab-html">
        <iframe id="docHtmlPreview" class="doc-iframe" title="HTML Documentation Preview"></iframe>
      </div>
    </div>

    <!-- Feature Selection -->
    <div class="docs-feature-selection">
      <div class="docs-feature-selection-header">
        <div class="docs-feature-sel-title">Feature Selection</div>
        <div class="docs-feature-sel-subtitle">Choose which features to include in the export</div>
      </div>
      <div class="docs-feature-grid" id="docsFeatureGrid"></div>
    </div>
  </div>

  <!-- Traceability Page -->
  <div class="page-panel" id="page-traceability">
    <div class="section" id="traceability-section"></div>
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
