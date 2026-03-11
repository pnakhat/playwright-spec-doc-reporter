export function getScriptInteractions(): string {
  return `
  function applyFilters() {
    const query = (document.getElementById('search-input').value || '').toLowerCase().trim();
    const activeStatuses = window.__activeStatuses || new Set(['all']);
    const activeType = window.__typeFilter || 'all';
    const activeTags = window.__activeTags || new Set();
    var matchCount = 0;
    var totalCount = 0;
    document.querySelectorAll('#suitesContainer .test-detail-block').forEach(function(row) {
      totalCount++;
      const st = row.getAttribute('data-status');
      const matchStatus = activeStatuses.has('all') || activeStatuses.has(st);
      const rowType = row.getAttribute('data-type') || 'other';
      const matchType = activeType === 'all' || rowType === activeType;
      const rowTags = (row.getAttribute('data-tags') || '').split(',').filter(Boolean);
      var matchTag = activeTags.size === 0;
      if (!matchTag) {
        activeTags.forEach(function(tag) {
          if (rowTags.indexOf(tag) >= 0) matchTag = true;
        });
      }
      const matchQuery = !query || (row.textContent || '').toLowerCase().includes(query);
      var show = matchStatus && matchType && matchTag && matchQuery;
      row.style.display = show ? '' : 'none';
      if (show) matchCount++;
    });
    document.querySelectorAll('#suitesContainer .suite-block').forEach(function(suite) {
      suite.style.display = suite.querySelectorAll('.test-detail-block:not([style*="display: none"])').length === 0 ? 'none' : '';
    });
    highlightSearchMatches(query);
    var countEl = document.getElementById('search-result-count');
    var hasActiveFilter = !activeStatuses.has('all') || activeType !== 'all' || activeTags.size > 0 || query;
    if (countEl) countEl.textContent = hasActiveFilter ? matchCount + ' of ' + totalCount + ' test' + (totalCount !== 1 ? 's' : '') : '';
  }

  function highlightSearchMatches(query) {
    document.querySelectorAll('.search-highlight').forEach(function(el) {
      var parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });
    if (!query) return;
    document.querySelectorAll('#suitesContainer .test-detail-block:not([style*="display: none"]) .suite-name').forEach(function(nameEl) {
      var text = nameEl.textContent || '';
      var lower = text.toLowerCase();
      var idx = lower.indexOf(query);
      if (idx === -1) return;
      nameEl.innerHTML = escHtml(text.slice(0, idx)) + '<span class="search-highlight">' + escHtml(text.slice(idx, idx + query.length)) + '</span>' + escHtml(text.slice(idx + query.length));
    });
  }

  var _searchDebounce = null;
  function bindFilters() {
    window.__activeStatuses = new Set(['all']);
    window.__typeFilter = 'all';
    window.__activeTags = new Set();

    // Search input
    document.getElementById('search-input').addEventListener('input', function() {
      clearTimeout(_searchDebounce);
      _searchDebounce = setTimeout(applyFilters, 180);
    });

    // Status filter buttons (pass/fail/skip)
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        var filter = btn.getAttribute('data-filter') || 'all';
        if (filter === 'all') {
          window.__activeStatuses = new Set(['all']);
          document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        } else {
          window.__activeStatuses.delete('all');
          document.querySelectorAll('.filter-btn[data-filter="all"]').forEach(b => b.classList.remove('active'));
          if (window.__activeStatuses.has(filter)) {
            window.__activeStatuses.delete(filter);
            btn.classList.remove('active');
          } else {
            window.__activeStatuses.add(filter);
            btn.classList.add('active');
          }
          if (window.__activeStatuses.size === 0) {
            window.__activeStatuses = new Set(['all']);
            document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
          }
        }
        applyFilters();
      });
    });

    // Render type filter buttons dynamically
    renderTypeFilterButtons();

    // Render tag filter buttons dynamically
    renderTagFilterButtons();
  }

  function renderTypeFilterButtons() {
    var typeGroup = document.getElementById('typeFilterGroup');
    if (!typeGroup) return;
    var types = collectTestTypes();
    var typeNames = Object.keys(types).sort();
    if (typeNames.length <= 1 && typeNames[0] === 'other') {
      // No meaningful types detected, keep a simple UI/API split
      typeGroup.innerHTML =
        '<button class="filter-btn type-btn active" data-type="all">All</button>' +
        '<button class="filter-btn type-btn" data-type="ui">UI</button>' +
        '<button class="filter-btn type-btn" data-type="api">API</button>';
    } else {
      var html = '<button class="filter-btn type-btn active" data-type="all">All</button>';
      var order = ['ui', 'api', 'e2e', 'unit', 'other'];
      order.forEach(function(t) {
        if (types[t]) {
          var label = t === 'other' ? 'Other' : t.toUpperCase();
          html += '<button class="filter-btn type-btn" data-type="' + t + '">' + label + ' <span style="opacity:0.6;font-size:0.62rem">' + types[t] + '</span></button>';
        }
      });
      typeGroup.innerHTML = html;
    }
    typeGroup.querySelectorAll('.type-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        window.__typeFilter = btn.getAttribute('data-type') || 'all';
        typeGroup.querySelectorAll('.type-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        applyFilters();
      });
    });
  }

  function renderTagFilterButtons() {
    var tagGroup = document.getElementById('tagFilterGroup');
    var tagDivider = document.getElementById('tagFilterDivider');
    if (!tagGroup) return;
    var allTags = collectAllTags();
    if (allTags.length === 0) {
      tagGroup.style.display = 'none';
      if (tagDivider) tagDivider.style.display = 'none';
      return;
    }
    if (tagDivider) tagDivider.style.display = '';
    var html = '';
    var maxVisible = 8;
    for (var i = 0; i < allTags.length; i++) {
      var item = allTags[i];
      html += '<button class="tag-btn" data-tag="' + escHtml(item.tag) + '">' + escHtml(item.tag) + '<span class="tag-count">' + item.count + '</span></button>';
    }
    if (allTags.length > maxVisible) {
      html += '<button class="tag-expand-btn" id="tagExpandBtn">+' + (allTags.length - maxVisible) + ' more</button>';
    }
    tagGroup.innerHTML = html;

    // Expand/collapse
    if (allTags.length > maxVisible) {
      var expandBtn = document.getElementById('tagExpandBtn');
      if (expandBtn) {
        expandBtn.addEventListener('click', function() {
          tagGroup.classList.toggle('expanded');
          expandBtn.textContent = tagGroup.classList.contains('expanded') ? 'Show less' : '+' + (allTags.length - maxVisible) + ' more';
        });
      }
    }

    // Tag toggle
    tagGroup.querySelectorAll('.tag-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var tag = btn.getAttribute('data-tag');
        if (window.__activeTags.has(tag)) {
          window.__activeTags.delete(tag);
          btn.classList.remove('active');
        } else {
          window.__activeTags.add(tag);
          btn.classList.add('active');
        }
        applyFilters();
      });
    });
  }

  // Allow clicking tag pills on test rows to activate that tag filter
  window.filterByTag = function(tag) {
    if (!tag) return;
    window.__activeTags = window.__activeTags || new Set();
    window.__activeTags.add(tag);
    // Activate the tag button in the filter bar
    document.querySelectorAll('.tag-btn').forEach(function(btn) {
      if (btn.getAttribute('data-tag') === tag) btn.classList.add('active');
    });
    applyFilters();
    // Scroll filter bar into view
    var fb = document.querySelector('.filter-bar');
    if (fb) fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  window.expandAllSuites = function() {
    document.querySelectorAll('.suite-body').forEach(b => b.classList.add('open'));
    document.querySelectorAll('.suite-toggle').forEach(t => t.classList.add('open'));
  };
  window.collapseAllSuites = function() {
    document.querySelectorAll('.suite-body').forEach(b => b.classList.remove('open'));
    document.querySelectorAll('.suite-toggle').forEach(t => t.classList.remove('open'));
  };
  window.jumpToFailed = function() {
    var pageBtn = document.querySelector('.page-nav-btn[data-page="tests"]');
    if (pageBtn) pageBtn.click();
    var btn = document.querySelector('.tab-btn[data-tab="failed"]');
    if (btn) { btn.click(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };
  window.toggleSuite = function(header) {
    const body = header.nextElementSibling;
    const toggle = header.querySelector('.suite-toggle');
    if (!body || !toggle) return;
    body.classList.toggle('open');
    toggle.classList.toggle('open');
  };
  window.toggleTestDetail = function(header) {
    var body = header.nextElementSibling;
    var toggle = header.querySelector('.suite-toggle');
    if (!body) return;
    body.classList.toggle('open');
    if (toggle) toggle.classList.toggle('open');
  };
  window.toggleScreenshotGallery = function(button) {
    const panel = document.getElementById(button.getAttribute('data-target'));
    if (!panel) return;
    panel.classList.toggle('open');
    const isOpen = panel.classList.contains('open');
    const total = panel.querySelectorAll('img').length;
    button.textContent = isOpen ? 'Hide screenshots (' + total + ')' : 'Show all screenshots (' + total + ')';
  };

  // Gallery
  function stopGalleryPlay() {
    if (galleryState.timer) { clearTimeout(galleryState.timer); galleryState.timer = null; }
    const btn = document.getElementById('galleryPlay');
    if (btn) btn.textContent = '\\u25b6 Play';
  }
  function renderGalleryFrame() {
    if (!galleryState.items.length) return;
    const image = document.getElementById('galleryImage');
    const video = document.getElementById('galleryVideo');
    const item = galleryState.items[galleryState.index];
    const src = normalizeMediaPath((item && item.src) || '');
    if ((item && item.type) === 'video') {
      image.style.display = 'none'; video.style.display = 'block';
      if (video.src !== src) video.src = src;
    } else {
      video.pause(); video.style.display = 'none'; image.style.display = 'block'; image.src = src;
    }
    document.getElementById('galleryCounter').textContent = (galleryState.index + 1) + ' / ' + galleryState.items.length;
    document.getElementById('galleryTitle').textContent = (item && item.label) ? item.label : (galleryState.title || 'Gallery');
    document.getElementById('galleryPrev').disabled = galleryState.index <= 0;
    document.getElementById('galleryNext').disabled = galleryState.index >= galleryState.items.length - 1;
  }
  function openGallery(items, index, title) {
    if (!Array.isArray(items) || items.length === 0) return;
    galleryState.items = items;
    galleryState.index = Math.max(0, Math.min(index, items.length - 1));
    galleryState.title = title || 'Gallery';
    document.getElementById('galleryOverlay').classList.add('open');
    renderGalleryFrame();
  }
  function closeGallery() {
    stopGalleryPlay();
    document.getElementById('galleryVideo').pause();
    document.getElementById('galleryOverlay').classList.remove('open');
  }
  function nextGallery() { if (galleryState.index < galleryState.items.length - 1) { galleryState.index++; renderGalleryFrame(); } }
  function prevGallery() { if (galleryState.index > 0) { galleryState.index--; renderGalleryFrame(); } }
  function playNextInSequence() {
    if (galleryState.index >= galleryState.items.length - 1) { stopGalleryPlay(); return; }
    galleryState.index++;
    renderGalleryFrame();
    const item = galleryState.items[galleryState.index];
    galleryState.timer = setTimeout(playNextInSequence, (item && item.type === 'video') ? 4500 : 1600);
  }
  function bindGalleryControls() {
    document.getElementById('galleryClose').addEventListener('click', closeGallery);
    document.getElementById('galleryNext').addEventListener('click', nextGallery);
    document.getElementById('galleryPrev').addEventListener('click', prevGallery);
    document.getElementById('galleryPlay').addEventListener('click', () => {
      if (galleryState.timer) { stopGalleryPlay(); return; }
      if (!galleryState.items.length) return;
      document.getElementById('galleryPlay').textContent = '\\u23f9 Stop';
      playNextInSequence();
    });
    document.getElementById('galleryOverlay').addEventListener('click', e => { if (e.target && e.target.id === 'galleryOverlay') closeGallery(); });
    document.addEventListener('keydown', e => {
      if (!document.getElementById('galleryOverlay').classList.contains('open')) return;
      if (e.key === 'Escape') closeGallery();
      if (e.key === 'ArrowRight') nextGallery();
      if (e.key === 'ArrowLeft') prevGallery();
    });
  }
  window.openScreenshotGalleryFromEl = function(img) {
    if (!img) return;
    const encoded = img.getAttribute('data-gallery-items') || '';
    const parsed = encoded ? JSON.parse(decodeURIComponent(encoded)) : [];
    const items = Array.isArray(parsed) ? parsed.map(e => typeof e === 'string' ? { type: 'image', src: e, label: 'Screenshot' } : e) : [];
    openGallery(items, Number(img.getAttribute('data-gallery-index') || '0'), 'Screenshot Gallery');
  };

  function getDocFilteredTests() {
    var statusFilter = document.querySelector('[data-doc-status].active');
    var activeStatus = statusFilter ? statusFilter.getAttribute('data-doc-status') : 'all';

    var totalFeatures = document.querySelectorAll('#docFeatureFilter input').length;
    var checkedFeatures = [];
    document.querySelectorAll('#docFeatureFilter input:checked').forEach(function(cb) {
      checkedFeatures.push(cb.value);
    });

    return tests.filter(function(t) {
      if (activeStatus === 'passed' && t.status !== 'passed') return false;
      if (activeStatus === 'failed' && t.status !== 'failed') return false;
      if (totalFeatures > 0 && checkedFeatures.length === 0) return false;
      if (checkedFeatures.length > 0) {
        var feat = (t.featureMeta && t.featureMeta.name) ? t.featureMeta.name : extractFeatureName(t);
        if (checkedFeatures.indexOf(feat) === -1) return false;
      }
      return true;
    });
  }

  function generateDocumentation(filteredTests) {
    var src = filteredTests || tests;
    var features = buildBddHierarchy(src);
    var lines = [];
    lines.push('# ' + (report.title || 'Test Suite') + ' \\u2014 Behaviour Specification');
    lines.push('');
    lines.push('> Describes the expected behaviours of the system under test.');
    lines.push('');
    for (var i = 0; i < features.length; i++) {
      var f = features[i];
      lines.push('## Feature: ' + f.name);
      lines.push('');
      if (f.description) { lines.push('> ' + f.description); lines.push(''); }
      for (var j = 0; j < f.scenarios.length; j++) {
        var sc = f.scenarios[j];
        lines.push('### Scenario: ' + sc.name);
        lines.push('');
        if (sc.description) { lines.push('_' + sc.description + '_'); lines.push(''); }
        if (sc.behaviours && sc.behaviours.length > 0) {
          for (var k = 0; k < sc.behaviours.length; k++) {
            lines.push('- ' + sc.behaviours[k]);
          }
          lines.push('');
        } else {
          var meaningfulSteps = sc.steps.filter(function(s) { return s.name && s.name !== 'Test execution'; });
          if (meaningfulSteps.length > 0) {
            for (var k = 0; k < meaningfulSteps.length; k++) {
              lines.push('- ' + meaningfulSteps[k].name);
            }
            lines.push('');
          }
        }
      }
      lines.push('---');
      lines.push('');
    }
    return lines.join('\\n');
  }

  function generateHtmlDocumentation(filteredTests) {
    var src = filteredTests || tests;
    var features = buildBddHierarchy(src);
    var parts = [];
    parts.push('<h1>' + escHtml(report.title || 'Test Suite') + ' \\u2014 Behaviour Specification</h1>');
    parts.push('<p class="subtitle">Describes the expected behaviours of the system under test.</p>');
    for (var i = 0; i < features.length; i++) {
      var f = features[i];
      parts.push('<section class="feature">');
      parts.push('<h2>Feature: ' + escHtml(f.name) + '</h2>');
      if (f.description) parts.push('<p class="feature-narrative">' + escHtml(f.description) + '</p>');
      for (var j = 0; j < f.scenarios.length; j++) {
        var sc = f.scenarios[j];
        parts.push('<div class="scenario">');
        parts.push('<h3>Scenario: ' + escHtml(sc.name) + '</h3>');
        if (sc.description) parts.push('<p class="scenario-narrative">' + escHtml(sc.description) + '</p>');
        if (sc.behaviours && sc.behaviours.length > 0) {
          parts.push('<ul>');
          for (var k = 0; k < sc.behaviours.length; k++) { parts.push('<li>' + escHtml(sc.behaviours[k]) + '</li>'); }
          parts.push('</ul>');
        } else {
          var meaningfulSteps = sc.steps.filter(function(s) { return s.name && s.name !== 'Test execution'; });
          if (meaningfulSteps.length > 0) {
            parts.push('<ul>');
            for (var k = 0; k < meaningfulSteps.length; k++) { parts.push('<li>' + escHtml(meaningfulSteps[k].name) + '</li>'); }
            parts.push('</ul>');
          }
        }
        parts.push('</div>');
      }
      parts.push('</section><hr>');
    }
    var body = parts.join('\\n');
    return '<!DOCTYPE html>\\n<html lang="en">\\n<head>\\n<meta charset="UTF-8">\\n' +
      '<title>' + escHtml(report.title || 'Test Suite') + ' \\u2014 Behaviour Specification</title>\\n' +
      '<style>\\nbody{font-family:system-ui,sans-serif;max-width:820px;margin:2.5rem auto;padding:0 1.5rem;color:#1a1a2e;line-height:1.65;font-size:15px}' +
      'h1{font-size:1.9rem;font-weight:800;border-bottom:3px solid #4f46e5;padding-bottom:.6rem;margin-bottom:0.4rem}' +
      '.subtitle{color:#6b7280;font-style:italic;margin-top:0;margin-bottom:2rem}' +
      'h2{font-size:1.25rem;font-weight:700;color:#4f46e5;margin-top:2rem;margin-bottom:0.5rem}' +
      'h3{font-size:1rem;font-weight:600;color:#374151;margin-top:1.2rem;margin-bottom:0.4rem}' +
      'ul{padding-left:1.4rem;margin:0.3rem 0}li{margin:0.25rem 0;color:#4b5563}' +
      '.feature{margin-bottom:0.5rem}.scenario{margin-left:1rem;margin-bottom:0.8rem}' +
      '.feature-narrative{color:#6b7280;font-style:italic;margin:0.2rem 0 0.8rem;font-size:0.95rem}' +
      '.scenario-narrative{color:#6b7280;font-style:italic;margin:0.15rem 0 0.5rem;font-size:0.9rem}' +
      'hr{border:none;border-top:1px solid #e5e7eb;margin:1.5rem 0}' +
      '\\n</style>\\n</head>\\n<body>\\n' + body + '\\n</body>\\n</html>';
  }

  function updateFeatureCount() {
    var total = document.querySelectorAll('#docFeatureFilter input').length;
    var checked = document.querySelectorAll('#docFeatureFilter input:checked').length;
    var el = document.getElementById('docsFeatureCount');
    if (el) el.textContent = checked === total ? '' : checked + '/' + total;
  }

  function renderDocFilters() {
    // Feature checkboxes
    var features = buildBddHierarchy(tests);
    var featHtml = '';
    features.forEach(function(f) {
      var id = 'docfeat_' + f.name.replace(/\\W/g, '_');
      featHtml += '<label class="doc-feature-check"><input type="checkbox" id="' + id + '" value="' + escHtml(f.name) + '" checked> ' + escHtml(f.name) + '</label>';
    });
    document.getElementById('docFeatureFilter').innerHTML = featHtml;
    updateFeatureCount();
  }

  function refreshDocContent() {
    var filtered = getDocFilteredTests();
    var md = generateDocumentation(filtered);
    document.getElementById('docMarkdownContent').textContent = md;
    var activeTab = document.querySelector('.doc-tab-btn.active');
    if (activeTab && activeTab.getAttribute('data-doc-tab') === 'html') {
      document.getElementById('docHtmlPreview').srcdoc = generateHtmlDocumentation(filtered);
    }
  }

  function bindDocPage() {
    renderDocFilters();
    refreshDocContent();

    // Status filter — auto-refresh on change
    document.querySelectorAll('[data-doc-status]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('[data-doc-status]').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        refreshDocContent();
      });
    });

    // Feature checkboxes — auto-refresh on change + update count badge
    document.getElementById('docFeatureFilter').addEventListener('change', function() {
      updateFeatureCount();
      refreshDocContent();
    });

    // Select All / None features
    document.getElementById('docSelectAll').addEventListener('click', function() {
      document.querySelectorAll('#docFeatureFilter input').forEach(function(cb) { cb.checked = true; });
      updateFeatureCount();
      refreshDocContent();
    });
    document.getElementById('docSelectNone').addEventListener('click', function() {
      document.querySelectorAll('#docFeatureFilter input').forEach(function(cb) { cb.checked = false; });
      updateFeatureCount();
      refreshDocContent();
    });

    // Features dropdown toggle
    var trigger = document.getElementById('docsFeatureTrigger');
    var panel = document.getElementById('docsFeaturePanel');
    if (trigger && panel) {
      trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        panel.classList.toggle('open');
      });
      document.addEventListener('click', function(e) {
        if (!document.getElementById('docsFeatureDropdownWrap').contains(e.target)) {
          panel.classList.remove('open');
        }
      });
    }

    // Tab switching
    document.querySelectorAll('.doc-tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.doc-tab-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.doc-tab-panel').forEach(function(p) { p.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById('doc-tab-' + btn.getAttribute('data-doc-tab')).classList.add('active');
        if (btn.getAttribute('data-doc-tab') === 'html') {
          document.getElementById('docHtmlPreview').srcdoc = generateHtmlDocumentation(getDocFilteredTests());
        }
      });
    });

    // Copy
    document.getElementById('docCopyBtn').addEventListener('click', function() {
      navigator.clipboard.writeText(generateDocumentation(getDocFilteredTests())).then(function() {
        var btn = document.getElementById('docCopyBtn');
        btn.textContent = '\\u2713 Copied!';
        setTimeout(function() { btn.innerHTML = '&#128203; Copy'; }, 1800);
      });
    });

    // Download .md
    document.getElementById('docDownloadMdBtn').addEventListener('click', function() {
      var blob = new Blob([generateDocumentation(getDocFilteredTests())], { type: 'text/markdown' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'behaviour-spec.md';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });

    // Download .html
    document.getElementById('docDownloadHtmlBtn').addEventListener('click', function() {
      var blob = new Blob([generateHtmlDocumentation(getDocFilteredTests())], { type: 'text/html' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'behaviour-spec.html';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });

    // PDF
    document.getElementById('docExportPdfBtn').addEventListener('click', function() {
      var win = window.open('', '_blank');
      if (win) { win.document.write(generateHtmlDocumentation(getDocFilteredTests())); win.document.close(); win.print(); }
    });
  }

  function initPageNav() {
    document.querySelectorAll('.page-nav-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var page = btn.getAttribute('data-page');
        document.querySelectorAll('.page-nav-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.page-panel').forEach(function(p) { p.classList.remove('active'); });
        btn.classList.add('active');
        var panel = document.getElementById('page-' + page);
        if (panel) panel.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  // Scroll to top
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  window.addEventListener('scroll', function() {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
  });
  scrollTopBtn.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
`;
}
