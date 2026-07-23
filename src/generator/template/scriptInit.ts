export function getScriptInit(): string {
  return `
  // Init
  renderTop();
  renderEnvInfo();
  renderProgressBar();
  renderStats();
  renderBddSummary();
  renderTestHealthMetrics();
  renderHealerActivity();
  renderAI();
  renderTabs();
  renderHealing();
  renderSuiteBlocks(sortByDurationDesc(tests), 'suitesContainer', true);
  renderFlatRows(tests, 'failedContainer', 'failed');
  renderFlatRows(tests, 'passedContainer', 'passed');
  renderFlatRows(tests, 'skippedContainer', 'skipped');
  renderSlow();
  renderScreenshotsTab();
  renderVideosTab();
  renderExecutiveSummary();
  renderAgenticInsights();
  renderTrends();
  bindFilters();
  bindGalleryControls();
  bindDocPage();
  renderTraceability();
  initPageNav();
  renderFooter();

  document.getElementById('btnExportPdf').addEventListener('click', function() { window.print(); });

  var btnShare = document.getElementById('btnShare');
  if (btnShare) {
    btnShare.addEventListener('click', function() {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href).then(function() {
          btnShare.textContent = '\\u2713 Copied!';
          setTimeout(function() { btnShare.innerHTML = '\\ud83d\\udd17 Share'; }, 1800);
        });
      }
    });
  }

  // Theme toggle
  (function initTheme() {
    var html = document.documentElement;
    var btn = document.getElementById('btnThemeToggle');
    var THEMES = ['dark-glossy', 'dark', 'light'];
    var ICONS  = { 'dark-glossy': '\\u2728', 'dark': '\\u{1F319}', 'light': '\\u2600\\uFE0F' };
    var stored = localStorage.getItem('glossy-theme');
    if (stored && THEMES.indexOf(stored) >= 0) html.setAttribute('data-theme', stored);

    function updateIcon() {
      var t = html.getAttribute('data-theme') || 'dark-glossy';
      btn.textContent = ICONS[t] || '\\u2600\\uFE0F';
    }
    updateIcon();

    btn.addEventListener('click', function() {
      var cur = html.getAttribute('data-theme') || 'dark-glossy';
      var next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
      html.setAttribute('data-theme', next);
      localStorage.setItem('glossy-theme', next);
      updateIcon();
    });
  })();
`;
}
