export function getScriptInit(): string {
  return `
  // Init
  renderTop();
  renderEnvInfo();
  renderProgressBar();
  renderStats();
  renderBddSummary();
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
  renderTrends();
  bindFilters();
  bindGalleryControls();
  bindDocPage();
  initPageNav();
  renderFooter();

  document.getElementById('btnExportPdf').addEventListener('click', function() { window.print(); });
`;
}
