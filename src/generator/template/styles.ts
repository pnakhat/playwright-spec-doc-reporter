export function getStyles(): string {
  return `
    :root {
      --bg: #0c0f17;
      --bg2: #121620;
      --bg3: #191d2a;
      --bg4: #202435;
      --bg5: #272c3e;
      --border: rgba(255,255,255,0.09);
      --border2: rgba(255,255,255,0.16);
      --border3: rgba(255,255,255,0.26);
      --text: #f0f2fa;
      --text1: #dde1ef;
      --text2: #a0a8be;
      --text3: #727a94;
      --pass: #10b981;
      --fail: #ef4444;
      --skip: #6366f1;
      --flaky: #f59e0b;
      --accent: #a5b0ff;
      --accent2: #7c83f5;
      --accent-glow: rgba(124,131,245,0.22);
      --radius: 14px;
      --radius-sm: 10px;
      --radius-xs: 7px;
      --shadow: 0 1px 4px rgba(0,0,0,0.4), 0 6px 20px rgba(0,0,0,0.2);
      --shadow-lg: 0 8px 40px rgba(0,0,0,0.45);
      --font: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
      --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', Consolas, monospace;
      --ease: 0.15s ease;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      font-feature-settings: 'cv11', 'ss01';
    }

    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--border3); }

    /* --- Topbar --- */
    .topbar {
      background: rgba(13,16,24,0.97);
      border-bottom: 1px solid var(--border);
      padding: 0 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 54px;
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(24px) saturate(1.6);
      -webkit-backdrop-filter: blur(24px) saturate(1.6);
    }
    .topbar-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 0.9rem; letter-spacing: -0.02em; }
    .topbar-logo {
      width: 30px; height: 30px;
      background: linear-gradient(135deg, #818cf8, #6366f1);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px;
      box-shadow: 0 2px 12px rgba(99,102,241,0.45);
    }
    .topbar-right { display: flex; align-items: center; gap: 0.75rem; }
    .topbar-meta { font-size: 0.72rem; color: var(--text2); display: flex; gap: 1.1rem; align-items: center; }
    .topbar-meta-item { display: flex; align-items: center; gap: 4px; }

    .btn-sm {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 12px; border-radius: 7px;
      border: 1px solid var(--border2);
      background: var(--bg3); color: var(--text2);
      font-size: 0.72rem; font-weight: 600; cursor: pointer;
      transition: all var(--ease);
      font-family: var(--font);
    }
    .btn-sm:hover { border-color: var(--accent); color: var(--text); background: var(--bg4); }
    .btn-sm.btn-accent { background: var(--accent2); color: #fff; border-color: var(--accent2); }
    .btn-sm.btn-accent:hover { background: var(--accent); border-color: var(--accent); }

    /* --- Failure banner --- */
    .failure-banner {
      background: linear-gradient(135deg, rgba(239,68,68,0.11), rgba(239,68,68,0.05));
      border-bottom: 1px solid rgba(239,68,68,0.18);
      padding: 0.45rem 1.5rem;
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .failure-banner.visible { display: flex; }
    .failure-banner-msg { color: #fca5a5; display: flex; align-items: center; gap: 7px; font-size: 0.81rem; font-weight: 600; }
    .failure-banner-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 12px; border-radius: 999px;
      background: rgba(239,68,68,0.18); color: #fca5a5;
      border: 1px solid rgba(239,68,68,0.28);
      font-size: 0.73rem; font-weight: 700; cursor: pointer;
      transition: all var(--ease); font-family: var(--font);
    }
    .failure-banner-btn:hover { background: rgba(239,68,68,0.32); border-color: rgba(239,68,68,0.5); }

    /* --- Container --- */
    .container { max-width: 1340px; margin: 0 auto; padding: 1.4rem 1.75rem; }

    /* --- Hero --- */
    .hero {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 2rem;
      align-items: start;
      margin-bottom: 0.85rem;
      padding: 1.75rem 2rem 1.6rem;
      background: var(--bg2);
      border-radius: var(--radius);
      border: 1px solid var(--border);
      position: relative;
      overflow: hidden;
      box-shadow: var(--shadow);
    }
    .hero::before {
      content: '';
      position: absolute; inset: 0;
      background:
        radial-gradient(ellipse at 80% 25%, rgba(99,102,241,0.14) 0%, transparent 55%),
        radial-gradient(ellipse at 10% 85%, rgba(16,185,129,0.07) 0%, transparent 45%);
      pointer-events: none;
    }
    .hero-left { position: relative; }
    .hero-title {
      font-size: 1.8rem; font-weight: 900; letter-spacing: -0.04em; line-height: 1.15;
      background: linear-gradient(135deg, #e8eaf0 20%, #818cf8 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .hero-subtitle { color: var(--text2); font-size: 0.79rem; margin-top: 0.4rem; }
    .hero-status {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 12px; border-radius: 100px;
      font-size: 0.71rem; font-weight: 700; margin-top: 0.7rem;
      letter-spacing: 0.05em; text-transform: uppercase;
    }
    .status-passed { background: rgba(16,185,129,0.14); color: var(--pass); border: 1px solid rgba(16,185,129,0.28); }
    .status-failed { background: rgba(239,68,68,0.14); color: var(--fail); border: 1px solid rgba(239,68,68,0.28); }
    .status-interrupted { background: rgba(245,158,11,0.14); color: var(--flaky); border: 1px solid rgba(245,158,11,0.28); }

    .env-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 0.9rem; }
    .env-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 9px; border-radius: 999px;
      font-size: 0.67rem; font-weight: 600;
      background: var(--bg3); border: 1px solid var(--border2); color: var(--text2);
    }

    /* --- Donut --- */
    .donut-wrap { position: relative; width: 130px; height: 130px; flex-shrink: 0; }
    .donut-wrap svg { transform: rotate(-90deg); }
    .donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .donut-pct { font-size: 1.8rem; font-weight: 900; letter-spacing: -0.06em; line-height: 1; }
    .donut-label { font-size: 0.63rem; color: var(--text2); text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px; }

    /* --- Progress bar --- */
    .progress-section { margin-bottom: 0.85rem; }
    .progress-stack {
      height: 6px; border-radius: 999px; overflow: hidden;
      background: var(--bg3); display: flex; gap: 1px;
    }
    .progress-seg { height: 100%; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
    .progress-seg-pass { background: var(--pass); }
    .progress-seg-fail { background: var(--fail); }
    .progress-seg-skip { background: var(--skip); }
    .progress-seg-flaky { background: var(--flaky); }
    .progress-labels { display: flex; gap: 1rem; margin-top: 0.45rem; flex-wrap: wrap; }
    .progress-label { display: flex; align-items: center; gap: 5px; font-size: 0.67rem; color: var(--text2); }
    .progress-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

    /* --- Stats grid --- */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(138px, 1fr));
      gap: 0.55rem;
      margin-bottom: 0.85rem;
    }
    .stat-card {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem 1.1rem;
      display: flex; flex-direction: column; gap: 3px;
      position: relative; overflow: hidden;
      box-shadow: var(--shadow);
      transition: border-color var(--ease), transform var(--ease), box-shadow var(--ease);
      cursor: default;
    }
    .stat-card:hover { border-color: var(--border2); transform: translateY(-2px); box-shadow: var(--shadow-lg); }
    .stat-card::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; }
    .stat-card.stat-pass::after { background: var(--pass); }
    .stat-card.stat-fail::after { background: var(--fail); }
    .stat-card.stat-skip::after { background: var(--skip); }
    .stat-card.stat-flaky::after { background: var(--flaky); }
    .stat-card.stat-duration::after { background: var(--accent); }
    .stat-card.stat-total::after { background: var(--border3); }
    .stat-icon { font-size: 1rem; margin-bottom: 1px; line-height: 1; }
    .stat-value { font-size: 2.1rem; font-weight: 900; letter-spacing: -0.06em; line-height: 1; font-variant-numeric: tabular-nums; }
    .stat-label { font-size: 0.68rem; color: var(--text2); text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; }

    /* --- Section --- */
    .section {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 0.85rem;
      overflow: hidden;
      box-shadow: var(--shadow);
    }
    .section-header {
      padding: 0.8rem 1rem;
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
    }
    .section-title { font-size: 0.9rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .section-actions { display: flex; align-items: center; gap: 5px; }

    /* --- Tabs --- */
    .tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      padding: 0 1rem;
      background: linear-gradient(180deg, var(--bg3) 0%, var(--bg2) 100%);
      overflow-x: auto; scrollbar-width: none;
    }
    .tabs::-webkit-scrollbar { display: none; }
    .tab-btn {
      padding: 0.68rem 1rem;
      font-size: 0.78rem; font-weight: 600;
      color: var(--text3);
      background: none; border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer; white-space: nowrap;
      margin-bottom: -1px;
      display: flex; align-items: center; gap: 6px;
      transition: color var(--ease);
      font-family: var(--font);
    }
    .tab-btn:hover { color: var(--text2); }
    .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
    .tab-count {
      background: var(--bg4); color: var(--text3);
      font-size: 0.65rem; padding: 1px 7px;
      border-radius: 100px; font-weight: 700;
      transition: all var(--ease);
    }
    .tab-btn.active .tab-count { background: var(--accent-glow); color: var(--accent); }
    .tab-panel { display: none; }
    .tab-panel.active { display: block; }

    /* --- Filter bar --- */
    .filter-bar {
      padding: 0.6rem 1rem;
      display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center;
      border-bottom: 1px solid var(--border);
      background: var(--bg2);
      position: sticky; top: 100px; z-index: 10;
    }
    .search-wrap { position: relative; flex: 1; min-width: 190px; }
    .search-icon { position: absolute; left: 0.6rem; top: 50%; transform: translateY(-50%); color: var(--text3); font-size: 0.78rem; pointer-events: none; }
    .search-input {
      width: 100%;
      padding: 0.38rem 0.65rem 0.38rem 2rem;
      background: var(--bg3);
      border: 1px solid var(--border2);
      border-radius: var(--radius-sm);
      color: var(--text); font-size: 0.82rem; font-family: var(--font);
      transition: border-color var(--ease); outline: none;
    }
    .search-input:focus { border-color: var(--accent); }
    .search-input::placeholder { color: var(--text3); }
    .filter-group { display: flex; gap: 3px; }
    .filter-btn {
      padding: 0.26rem 0.68rem;
      border-radius: 100px;
      border: 1px solid var(--border2);
      background: var(--bg3); color: var(--text2);
      font-size: 0.74rem; font-weight: 600; cursor: pointer;
      transition: all var(--ease); font-family: var(--font); white-space: nowrap;
    }
    .filter-btn:hover { border-color: var(--border3); color: var(--text); }
    .filter-btn.active { background: var(--accent2); color: #fff; border-color: var(--accent2); }
    .filter-divider { width: 1px; background: var(--border); margin: 0 2px; align-self: stretch; }

    /* --- Type filter --- */
    .type-btn { text-transform: uppercase; font-size: 0.68rem; letter-spacing: 0.04em; }
    .type-btn.active[data-type="ui"] { background: #8b5cf6; border-color: #8b5cf6; }
    .type-btn.active[data-type="api"] { background: #0ea5e9; border-color: #0ea5e9; }
    .type-btn.active[data-type="e2e"] { background: #10b981; border-color: #10b981; }
    .type-btn.active[data-type="unit"] { background: #f59e0b; border-color: #f59e0b; }

    /* --- Tag filter --- */
    .tag-filter-group { display: flex; gap: 3px; flex-wrap: wrap; overflow: hidden; max-height: 30px; transition: max-height 0.25s ease; }
    .tag-filter-group.expanded { max-height: 200px; }
    .tag-btn {
      padding: 0.18rem 0.58rem;
      border-radius: 100px;
      border: 1px solid var(--border2);
      background: var(--bg3); color: var(--text3);
      font-size: 0.68rem; font-weight: 600; cursor: pointer;
      transition: all var(--ease); font-family: var(--font-mono); white-space: nowrap;
    }
    .tag-btn:hover { border-color: var(--accent); color: var(--text1); }
    .tag-btn.active { background: rgba(129,140,248,0.18); color: var(--accent); border-color: var(--accent); }
    .tag-btn .tag-count { font-size: 0.6rem; color: var(--text3); margin-left: 3px; opacity: 0.7; }
    .tag-btn.active .tag-count { color: var(--accent); opacity: 0.9; }
    .tag-expand-btn {
      padding: 0.18rem 0.45rem; border-radius: 100px;
      border: 1px solid var(--border); background: none; color: var(--text3);
      font-size: 0.62rem; cursor: pointer; transition: all var(--ease); font-family: var(--font);
    }
    .tag-expand-btn:hover { color: var(--text1); border-color: var(--border2); }

    /* --- Tag pill on test rows --- */
    .test-tag-pill {
      display: inline-flex; align-items: center; padding: 0px 6px; border-radius: 4px;
      font-size: 0.6rem; font-weight: 600; font-family: var(--font-mono);
      background: rgba(129,140,248,0.1); color: var(--accent); border: 1px solid rgba(129,140,248,0.18);
      white-space: nowrap; cursor: pointer; transition: all var(--ease);
    }
    .test-tag-pill:hover { background: rgba(129,140,248,0.22); border-color: rgba(129,140,248,0.35); }
    .test-type-pill {
      display: inline-flex; align-items: center; padding: 0px 6px; border-radius: 4px;
      font-size: 0.58rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
      white-space: nowrap;
    }
    .test-type-ui { background: rgba(139,92,246,0.12); color: #a78bfa; }
    .test-type-api { background: rgba(14,165,233,0.12); color: #38bdf8; }
    .test-type-e2e { background: rgba(16,185,129,0.12); color: #34d399; }
    .test-type-unit { background: rgba(245,158,11,0.12); color: #fbbf24; }
    .test-type-other { background: var(--bg4); color: var(--text3); }

    /* --- Suite blocks --- */
    .suites-container { padding: 0.65rem; display: flex; flex-direction: column; gap: 0.4rem; }
    .suite-block {
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden; background: var(--bg3);
      transition: border-color var(--ease);
    }
    .suite-block:hover { border-color: var(--border2); }
    .suite-block.suite-failed { border-left: 3px solid var(--fail); }
    .suite-block.suite-passed { border-left: 3px solid var(--pass); }
    .suite-header {
      padding: 0.62rem 0.9rem;
      display: flex; align-items: center; justify-content: space-between;
      cursor: pointer; gap: 0.75rem; user-select: none;
    }
    .suite-header:hover { background: rgba(255,255,255,0.025); }
    .suite-header-left { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
    .suite-header-right { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
    .suite-toggle { font-size: 0.58rem; color: var(--text3); transition: transform 0.2s ease; display: inline-flex; flex-shrink: 0; }
    .suite-toggle.open { transform: rotate(90deg); }
    .suite-name { font-weight: 700; font-size: 0.84rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .suite-file { color: var(--text3); font-size: 0.68rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--font-mono); margin-top: 1px; }
    .suite-body { display: none; border-top: 1px solid var(--border); }
    .suite-body.open { display: block; animation: fadeIn 0.14s ease; }

    @keyframes fadeIn { from { opacity: 0.5; transform: translateY(-2px); } to { opacity: 1; transform: translateY(0); } }

    /* --- Badges --- */
    .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 100px; font-size: 0.66rem; font-weight: 700; white-space: nowrap; }
    .badge-pass { background: rgba(16,185,129,0.14); color: var(--pass); }
    .badge-fail { background: rgba(239,68,68,0.14); color: var(--fail); }
    .badge-skip { background: rgba(99,102,241,0.14); color: var(--skip); }
    .badge-flaky { background: rgba(245,158,11,0.14); color: var(--flaky); }
    .badge-neutral { background: var(--bg4); color: var(--text2); }

    /* --- Status icons --- */
    .status-icon { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; font-size: 0.61rem; font-weight: 800; flex-shrink: 0; }
    .status-passed-icon { background: rgba(16,185,129,0.14); color: var(--pass); }
    .status-failed-icon { background: rgba(239,68,68,0.14); color: var(--fail); }
    .status-skipped-icon { background: rgba(99,102,241,0.14); color: var(--skip); }

    /* --- Test detail --- */
    .test-detail-block { padding: 0.6rem 0.9rem; border-top: 1px solid var(--border); }
    .test-detail-header {
      display: flex; align-items: center; justify-content: space-between;
      cursor: pointer; padding: 0.42rem 0.6rem; border-radius: var(--radius-xs);
      transition: background var(--ease);
    }
    .test-detail-header:hover { background: rgba(255,255,255,0.04); }
    .test-detail-body { display: none; padding: 0.4rem 0.2rem 0.1rem; }
    .test-detail-body.open { display: block; animation: fadeIn 0.1s ease; }
    .video-section { margin-top: 0.6rem; }

    /* --- Error display --- */
    .test-error {
      margin-top: 0.4rem; padding: 0.5rem 0.7rem;
      background: rgba(239,68,68,0.07); border-radius: var(--radius-xs);
      border-left: 2px solid var(--fail); position: relative;
    }
    .test-error pre { font-size: 0.7rem; color: #fca5a5; white-space: pre-wrap; word-break: break-word; font-family: var(--font-mono); line-height: 1.65; }
    .copy-btn {
      position: absolute; top: 0.38rem; right: 0.38rem;
      padding: 2px 8px; border-radius: 4px;
      border: 1px solid rgba(239,68,68,0.28); background: rgba(239,68,68,0.1);
      color: #fca5a5; font-size: 0.62rem; font-weight: 700; cursor: pointer;
      transition: all var(--ease); font-family: var(--font);
    }
    .copy-btn:hover { background: rgba(239,68,68,0.22); border-color: rgba(239,68,68,0.45); }
    .copy-btn.copied { border-color: rgba(16,185,129,0.35); background: rgba(16,185,129,0.1); color: var(--pass); }

    /* --- Code snippet --- */
    .code-snippet {
      margin-top: 0.45rem;
      background: #0b0e15; border-radius: var(--radius-xs);
      overflow-x: auto; font-family: var(--font-mono); font-size: 0.72rem; line-height: 1.7;
      border: 1px solid var(--border2);
    }
    .code-snippet-file { padding: 0.28rem 0.75rem; font-size: 0.66rem; color: var(--text3); border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.02); }
    .code-snippet-lines { padding: 0.2rem 0; }
    .code-line { display: flex; padding: 0 0.75rem; }
    .code-line.error-line { background: rgba(239,68,68,0.11); }
    .code-line-num { width: 38px; flex-shrink: 0; text-align: right; padding-right: 12px; color: var(--text3); user-select: none; }
    .code-line-marker { width: 16px; flex-shrink: 0; color: var(--fail); font-weight: 700; }
    .code-line-text { flex: 1; white-space: pre; color: #c9d7e8; }

    .healing-md-pre { display:none; font-size:0.7rem; background:#0d1117; padding:0.75rem 1rem; border-radius:6px; border:1px solid var(--border); color:#c9d1d9; white-space:pre-wrap; word-break:break-word; max-height:500px; overflow-y:auto; font-family:var(--font-mono); line-height:1.6; }

    /* --- Artifacts --- */
    .artifact-grid { margin-top: 0.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem; }
    .artifact-card { border: 1px solid var(--border2); border-radius: var(--radius-xs); overflow: hidden; background: rgba(0,0,0,0.22); }
    .artifact-label { padding: 0.28rem 0.5rem; font-size: 0.67rem; color: var(--text2); border-bottom: 1px solid var(--border); font-weight: 600; }
    .artifact-card img { width: 100%; display: block; max-height: 220px; object-fit: contain; background: #080a0f; cursor: zoom-in; transition: opacity var(--ease); }
    .artifact-card img:hover { opacity: 0.88; }
    .artifact-card video { width: 100%; display: block; max-height: 240px; background: #000; }
    .artifact-link { display: block; padding: 0.26rem 0.5rem; border-top: 1px solid var(--border); color: var(--text2); font-size: 0.68rem; text-decoration: none; transition: color var(--ease); }
    .artifact-link:hover { color: var(--accent); }
    .media-summary { margin-top: 0.4rem; font-size: 0.72rem; color: var(--text2); }
    .media-pill { display: inline-flex; align-items: center; margin-left: 5px; padding: 1px 6px; border-radius: 999px; background: var(--bg4); color: var(--text2); font-size: 0.65rem; font-weight: 600; }
    .screenshot-toggle { margin-top: 0.4rem; font-size: 0.72rem; padding: 0.26rem 0.65rem; border-radius: 999px; border: 1px solid var(--border2); background: transparent; color: var(--text2); cursor: pointer; transition: all var(--ease); font-family: var(--font); }
    .screenshot-toggle:hover { border-color: var(--accent); color: var(--accent); }
    .screenshot-gallery { display: none; margin-top: 0.45rem; }
    .screenshot-gallery.open { display: block; }

    /* --- Steps --- */
    .behaviours-section { margin-top: 0.55rem; }
    .behaviours-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.22rem; }
    .behaviour-item { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.8rem; color: var(--text1); padding: 0.3rem 0.55rem; border-radius: 5px; background: var(--bg3); }
    .behaviour-item::before { content: "\\2713"; color: var(--pass); font-weight: 800; flex-shrink: 0; font-size: 0.72rem; margin-top: 1px; }
    .behaviour-pill { background: rgba(99,102,241,0.13) !important; color: var(--accent) !important; }
    .api-pill { background: rgba(20,184,166,0.13) !important; color: #14b8a6 !important; }
    .feature-description { font-size: 0.74rem; color: var(--text3); font-style: italic; margin-top: 0.1rem; line-height: 1.4; }
    .scenario-description { font-size: 0.77rem; color: var(--text2); font-style: italic; padding: 0.3rem 0.55rem 0.1rem; }
    /* --- API calls --- */
    .api-section { margin-top: 0.65rem; display: flex; flex-direction: column; gap: 0; }
    .api-call-block { background: var(--bg2); border: 1px solid var(--border); border-radius: 7px; overflow: hidden; margin-bottom: 0.5rem; }
    .api-call-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem 0.65rem; border-bottom: 1px solid var(--border); background: var(--bg3); }
    .api-method { font-size: 0.65rem; font-weight: 800; font-family: var(--font-mono); padding: 2px 7px; border-radius: 4px; letter-spacing: 0.05em; text-transform: uppercase; }
    .api-method-get  { background: rgba(34,197,94,0.15); color: #22c55e; }
    .api-method-post { background: rgba(59,130,246,0.15); color: #3b82f6; }
    .api-method-put  { background: rgba(234,179,8,0.15);  color: #eab308; }
    .api-method-patch{ background: rgba(249,115,22,0.15); color: #f97316; }
    .api-method-delete{background: rgba(239,68,68,0.15);  color: #ef4444; }
    .api-url { font-size: 0.76rem; font-family: var(--font-mono); color: var(--text1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .api-response-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.65rem; border-top: 1px solid var(--border); background: var(--bg3); }
    .api-status { font-size: 0.65rem; font-weight: 800; font-family: var(--font-mono); padding: 2px 7px; border-radius: 4px; }
    .api-status-ok  { background: rgba(34,197,94,0.15); color: #22c55e; }
    .api-status-err { background: rgba(239,68,68,0.15); color: #ef4444; }
    .api-response-label { font-size: 0.68rem; color: var(--text3); font-weight: 600; }
    .api-body-label { font-size: 0.65rem; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.06em; padding: 0.35rem 0.65rem 0.1rem; }
    .api-json-block { margin: 0; padding: 0.4rem 0.65rem 0.5rem; font-size: 0.73rem; font-family: var(--font-mono); line-height: 1.55; color: var(--text1); white-space: pre-wrap; word-break: break-all; max-height: 280px; overflow-y: auto; background: transparent; }
    .api-headers-toggle { padding: 0.2rem 0.65rem; font-size: 0.7rem; color: var(--text3); }
    .api-headers-toggle summary { cursor: pointer; user-select: none; }
    .api-call-divider { height: 0; }
    .json-key { color: #93c5fd; }
    .json-str { color: #86efac; }
    .json-num { color: #fdba74; }
    .json-kw  { color: #c4b5fd; }
    /* --- Steps --- */
    .steps-section { margin-top: 0.55rem; }
    .steps-table { width: 100%; border-collapse: collapse; font-size: 0.77rem; }
    .steps-table th { text-align: left; padding: 0.28rem 0.55rem; color: var(--text3); font-weight: 700; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.07em; border-bottom: 1px solid var(--border); }
    .steps-table td { padding: 0.3rem 0.55rem; border-bottom: 1px solid var(--border); vertical-align: top; }
    .step-status { display: inline-flex; align-items: center; justify-content: center; width: 17px; height: 17px; border-radius: 50%; font-size: 0.57rem; font-weight: 800; }
    .step-title-text { display: block; }
    .step-category { display: inline-block; font-size: 0.63rem; color: var(--text3); padding: 0 5px; border-radius: 3px; background: var(--border); margin-left: 5px; }
    .step-error { margin-top: 0.28rem; padding: 0.26rem 0.45rem; background: rgba(239,68,68,0.07); border-radius: 4px; border-left: 2px solid var(--fail); font-size: 0.7rem; color: #fca5a5; white-space: pre-wrap; word-break: break-word; font-family: var(--font-mono); }
    .step-screenshot { margin-top: 0.28rem; max-width: 180px; border-radius: 4px; border: 1px solid var(--border2); cursor: zoom-in; }

    /* --- AI section --- */
    .ai-summary { padding: 0.8rem 1rem; color: var(--text2); font-size: 0.84rem; border-bottom: 1px solid var(--border); line-height: 1.6; }
    .ai-grid { display: grid; grid-template-columns: 1fr 1fr; }
    .ai-card { background: var(--bg2); padding: 1rem; border-right: 1px solid var(--border); }
    .ai-card:last-child { border-right: none; }
    .ai-card-title { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text3); margin-bottom: 0.7rem; display: flex; align-items: center; gap: 6px; }
    .finding-item { padding: 0.45rem 0.65rem; border-radius: var(--radius-xs); margin-bottom: 0.38rem; border-left: 2px solid; font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .finding-error { background: rgba(239,68,68,0.06); border-color: var(--fail); }
    .finding-warning { background: rgba(245,158,11,0.06); border-color: var(--flaky); }
    .finding-count { font-size: 0.67rem; padding: 1px 7px; border-radius: 999px; background: var(--bg4); color: var(--text2); font-weight: 700; flex-shrink: 0; }
    .ai-remediation { padding: 0.42rem 0.65rem; border-radius: var(--radius-xs); font-size: 0.79rem; color: var(--text1); line-height: 1.55; margin-bottom: 0.32rem; border: 1px solid var(--border); background: var(--bg3); display: flex; gap: 6px; }
    .ai-remediation-dot { color: var(--accent); font-weight: 700; flex-shrink: 0; margin-top: 1px; }
    .ai-disabled { padding: 2rem 1rem; text-align: center; color: var(--text2); }
    .ai-disabled-icon { font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5; }
    .ai-health-bar { height: 3px; background: var(--bg3); border-radius: 999px; overflow: hidden; }
    .ai-health-fill { height: 100%; border-radius: 999px; transition: width 0.5s ease; }
    .ai-insight { margin: 0.45rem 0; padding: 0.55rem 0.75rem; background: rgba(99,102,241,0.06); border-radius: var(--radius-xs); border-left: 2px solid var(--accent); }
    .ai-insight-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.28rem; }
    .ai-insight-label { font-size: 0.72rem; font-weight: 800; color: var(--accent); }
    .ai-insight-conf { font-size: 0.65rem; font-weight: 700; }
    .ai-insight-row { font-size: 0.77rem; color: var(--text1); margin-bottom: 0.18rem; line-height: 1.5; }
    .ai-insight-row strong { color: var(--text); }

    /* --- Slow list --- */
    .slow-list { padding: 0; }
    .slow-item { display: flex; align-items: center; gap: 0.85rem; padding: 0.62rem 1rem; border-bottom: 1px solid var(--border); transition: background var(--ease); }
    .slow-item:last-child { border-bottom: none; }
    .slow-item:hover { background: rgba(255,255,255,0.018); }
    .slow-rank { font-size: 0.69rem; color: var(--text3); width: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .slow-title { flex: 1; font-size: 0.8rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .slow-bar-wrap { width: 100px; height: 4px; background: var(--bg4); border-radius: 2px; overflow: hidden; flex-shrink: 0; }
    .slow-bar { height: 100%; background: linear-gradient(90deg, var(--accent2), var(--accent)); border-radius: 2px; }
    .slow-dur { font-size: 0.72rem; color: var(--text2); width: 62px; text-align: right; flex-shrink: 0; font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

    /* --- BDD --- */
    .bdd-label { display: inline-flex; align-items: center; padding: 1px 7px; border-radius: 4px; font-size: 0.6rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; flex-shrink: 0; }
    .bdd-feature { background: rgba(99,102,241,0.12); color: var(--accent); }
    .bdd-scenario { background: rgba(16,185,129,0.12); color: var(--pass); }
    .bdd-step { background: rgba(139,144,160,0.12); color: var(--text2); }
    .bdd-summary-bar { display: flex; gap: 1.2rem; flex-wrap: wrap; padding: 0.7rem 1rem; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 0.85rem; box-shadow: var(--shadow); }
    .bdd-summary-item { display: flex; align-items: center; gap: 6px; font-size: 0.76rem; color: var(--text2); }
    .bdd-summary-value { font-weight: 800; color: var(--text); font-size: 0.88rem; font-variant-numeric: tabular-nums; }
    .bdd-summary-sep { width: 1px; background: var(--border2); align-self: stretch; margin: 0 0.2rem; }

    /* --- Multi-select filter --- */
    .filter-btn.active { background: var(--accent2); color: #fff; border-color: var(--accent2); }
    .filter-btn.active[data-filter="passed"] { background: var(--pass); border-color: var(--pass); }
    .filter-btn.active[data-filter="failed"] { background: var(--fail); border-color: var(--fail); }
    .filter-btn.active[data-filter="skipped"] { background: var(--skip); border-color: var(--skip); }
    .search-highlight { background: rgba(245,158,11,0.35); color: #fff; border-radius: 2px; padding: 0 1px; }
    .search-result-count { font-size: 0.68rem; color: var(--text3); margin-left: 0.5rem; white-space: nowrap; }

    /* --- Screenshots / Videos tab --- */
    .media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.65rem; padding: 0.85rem; }
    .media-card { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; cursor: pointer; transition: border-color var(--ease), transform var(--ease); }
    .media-card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .media-card img, .media-card video { width: 100%; height: 150px; object-fit: cover; display: block; }
    .media-card-info { padding: 0.45rem 0.6rem; }
    .media-card-title { font-size: 0.72rem; color: var(--text1); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .media-card-sub { font-size: 0.63rem; color: var(--text3); margin-top: 2px; }

    /* --- Executive Summary --- */
    .exec-summary { padding: 1rem 1.15rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .exec-left { display: flex; flex-direction: column; gap: 0.65rem; }
    .exec-right { display: flex; flex-direction: column; gap: 0.65rem; }
    .exec-narrative { font-size: 0.82rem; color: var(--text1); line-height: 1.65; }
    .exec-metric { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0.7rem; background: var(--bg3); border-radius: var(--radius-xs); border: 1px solid var(--border); }
    .exec-metric-value { font-size: 1.35rem; font-weight: 900; font-variant-numeric: tabular-nums; }
    .exec-metric-label { font-size: 0.72rem; color: var(--text2); }
    .exec-top-failures { padding: 0; margin: 0; list-style: none; }
    .exec-top-failures li { padding: 0.35rem 0; border-bottom: 1px solid var(--border); font-size: 0.76rem; color: var(--text1); display: flex; align-items: center; gap: 6px; }
    .exec-top-failures li:last-child { border-bottom: none; }
    .exec-health-indicator { display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
    .exec-health-good { background: rgba(16,185,129,0.14); color: var(--pass); }
    .exec-health-warn { background: rgba(245,158,11,0.14); color: var(--flaky); }
    .exec-health-bad { background: rgba(239,68,68,0.14); color: var(--fail); }
    @media (max-width: 700px) { .exec-summary { grid-template-columns: 1fr; } }

    /* --- Page nav --- */
    .page-nav {
      background: rgba(13,16,24,0.97);
      border-bottom: 1px solid var(--border);
      position: sticky; top: 54px; z-index: 40;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    .page-nav { display: flex; padding: 0 1.5rem; gap: 2px; }
    .page-nav-btn {
      padding: 0.62rem 1.1rem;
      font-size: 0.82rem; font-weight: 600;
      color: var(--text3);
      background: none; border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer; white-space: nowrap;
      margin-bottom: -1px;
      display: flex; align-items: center; gap: 6px;
      transition: color var(--ease);
      font-family: var(--font);
    }
    .page-nav-btn:hover { color: var(--text2); }
    .page-nav-btn.active { color: var(--accent); border-bottom-color: var(--accent); }

    /* --- Page panels --- */
    .page-panel { display: none; }
    .page-panel.active { display: block; }

    /* --- Doc generation modal --- */
    .doc-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: none; align-items: center; justify-content: center; z-index: 300; padding: 1rem; }
    .doc-modal-overlay.open { display: flex; }
    .doc-modal { width: min(780px, 95vw); height: min(80vh, 700px); background: var(--bg2); border: 1px solid var(--border2); border-radius: var(--radius); overflow: hidden; display: flex; flex-direction: column; box-shadow: var(--shadow-lg); }
    .doc-modal-head { padding: 0.7rem 1rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
    .doc-modal-title { font-size: 0.88rem; font-weight: 700; }
    .doc-modal-tabs { display: flex; padding: 0 1rem; background: var(--bg3); border-bottom: 1px solid var(--border); flex-shrink: 0; }
    .doc-tab-btn {
      padding: 0.55rem 0.9rem;
      font-size: 0.78rem; font-weight: 600;
      color: var(--text3);
      background: none; border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer; white-space: nowrap;
      margin-bottom: -1px;
      transition: color var(--ease);
      font-family: var(--font);
    }
    .doc-tab-btn:hover { color: var(--text2); }
    .doc-tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
    .doc-modal-body { flex: 1; overflow: hidden; position: relative; }
    .doc-tab-panel { display: none; height: 100%; overflow-y: auto; }
    .doc-tab-panel.active { display: block; }
    .doc-tab-panel pre { margin: 0; padding: 1rem; font-size: 0.75rem; line-height: 1.6; font-family: var(--font-mono); color: var(--text1); white-space: pre-wrap; word-break: break-word; background: var(--bg); min-height: 100%; }
    #docHtmlPreview { width: 100%; height: 100%; border: none; display: block; background: #fff; }
    .doc-modal-footer { padding: 0.55rem 1rem; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 0.4rem; flex-shrink: 0; }

    /* --- Empty state --- */
    .empty-state { padding: 3rem 1rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.45rem; }
    .empty-state-icon { font-size: 2rem; opacity: 0.45; }
    .empty-state-title { font-size: 0.88rem; font-weight: 700; color: var(--text1); }
    .empty-state-msg { font-size: 0.78rem; color: var(--text2); max-width: 300px; line-height: 1.55; }

    /* --- Trends Page --- */
    .trends-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1.5rem 1.5rem 0.75rem; }
    .trends-header-left { display: flex; flex-direction: column; gap: 0.2rem; }
    .trends-title { font-size: 1.15rem; font-weight: 800; color: var(--text); letter-spacing: -0.02em; }
    .trends-subtitle { font-size: 0.77rem; color: var(--text3); }
    .trends-header-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
    .trends-no-data { padding: 3rem 1.5rem; text-align: center; color: var(--text3); font-size: 0.82rem; line-height: 1.7; }
    .trends-no-data-icon { font-size: 2.2rem; margin-bottom: 0.6rem; }
    .trends-charts-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; padding: 0 1.5rem 1rem; }
    @media (max-width: 900px) { .trends-charts-row { grid-template-columns: 1fr; } }
    .trends-chart-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 1rem 1.1rem 0.8rem; }
    .trends-chart-label { font-size: 0.72rem; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.55rem; display: flex; align-items: center; gap: 6px; }
    .trends-chart-current { font-size: 1.55rem; font-weight: 800; color: var(--text); letter-spacing: -0.03em; line-height: 1; margin-bottom: 0.45rem; }
    .trends-chart-delta { font-size: 0.73rem; font-weight: 600; margin-bottom: 0.6rem; }
    .trends-chart-delta.up { color: var(--pass); }
    .trends-chart-delta.down { color: var(--fail); }
    .trends-chart-delta.neutral { color: var(--text3); }
    .sparkline { width: 100%; height: 44px; overflow: visible; }
    .sparkline-line { fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .sparkline-area { opacity: 0.10; }
    .sparkline-dot { r: 3; }
    .trends-tables-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 0 1.5rem 1rem; }
    @media (max-width: 900px) { .trends-tables-row { grid-template-columns: 1fr; } }
    .trends-table-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.9rem 1.05rem; }
    .trends-card-title { font-size: 0.75rem; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.65rem; }
    .trends-regression-item { display: flex; flex-direction: column; gap: 0.15rem; padding: 0.55rem 0; border-bottom: 1px solid var(--border); }
    .trends-regression-item:last-child { border-bottom: none; }
    .trends-regression-name { font-size: 0.8rem; font-weight: 600; color: var(--text1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .trends-regression-meta { font-size: 0.68rem; color: var(--text3); }
    .trends-regression-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.67rem; font-weight: 700; padding: 1px 7px; border-radius: 999px; }
    .trend-badge-regressed { background: rgba(239,68,68,0.14); color: var(--fail); }
    .trend-badge-recovered { background: rgba(16,185,129,0.13); color: var(--pass); }
    .trend-badge-new-fail { background: rgba(245,158,11,0.14); color: var(--flaky); }
    .trends-history-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.9rem 1.05rem; margin: 0 1.5rem 1.5rem; }
    .trends-run-table { width: 100%; border-collapse: collapse; font-size: 0.76rem; }
    .trends-run-table th { text-align: left; padding: 0.3rem 0.5rem; font-size: 0.67rem; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid var(--border); }
    .trends-run-table td { padding: 0.42rem 0.5rem; border-bottom: 1px solid var(--border); color: var(--text2); vertical-align: middle; }
    .trends-run-table tr:last-child td { border-bottom: none; }
    .trends-run-table tr:hover td { background: var(--bg3); }
    .trends-run-table td:first-child { color: var(--text1); font-weight: 600; }
    .trend-pass-rate-bar { display: inline-block; height: 6px; border-radius: 3px; background: var(--pass); min-width: 4px; vertical-align: middle; margin-right: 4px; }
    .trends-empty { padding: 1.5rem; text-align: center; color: var(--text3); font-size: 0.78rem; }

    /* --- Footer --- */
    .footer { text-align: center; padding: 2rem; color: var(--text3); font-size: 0.7rem; display: flex; flex-direction: column; gap: 4px; align-items: center; }
    .footer-link { color: var(--text2); text-decoration: none; transition: color var(--ease); }
    .footer-link:hover { color: var(--accent); }

    /* --- Gallery --- */
    .gallery-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); display: none; align-items: center; justify-content: center; z-index: 200; padding: 1rem; }
    .gallery-overlay.open { display: flex; }
    .gallery-panel { width: min(1100px, 96vw); max-height: 92vh; background: #0c0f18; border: 1px solid var(--border2); border-radius: 14px; overflow: hidden; display: grid; grid-template-rows: auto 1fr auto auto; box-shadow: 0 24px 80px rgba(0,0,0,0.65); }
    .gallery-head { display: flex; align-items: center; justify-content: space-between; gap: 0.7rem; padding: 0.62rem 0.9rem; border-bottom: 1px solid var(--border); }
    .gallery-head-left { display: flex; align-items: center; gap: 0.75rem; font-size: 0.78rem; color: var(--text2); }
    .gallery-close-btn { width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--border2); background: var(--bg3); color: var(--text2); font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all var(--ease); }
    .gallery-close-btn:hover { border-color: rgba(239,68,68,0.4); color: #fca5a5; background: rgba(239,68,68,0.1); }
    .gallery-body { min-height: 300px; display: flex; align-items: center; justify-content: center; background: #07090f; padding: 0.7rem; }
    .gallery-image { max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 4px; }
    .gallery-video { max-width: 100%; max-height: 70vh; display: none; background: #000; }
    .gallery-controls { display: flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.62rem; border-top: 1px solid var(--border); }
    .gallery-btn { padding: 0.28rem 0.8rem; border-radius: 999px; border: 1px solid var(--border2); background: var(--bg3); color: var(--text2); font-size: 0.73rem; cursor: pointer; transition: all var(--ease); font-family: var(--font); font-weight: 600; }
    .gallery-btn:hover { border-color: var(--accent); color: var(--text); }
    .gallery-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .gallery-hint { font-size: 0.63rem; color: var(--text3); text-align: center; padding: 0.18rem 0.65rem 0.42rem; }

    /* --- Scroll to top --- */
    .scroll-top { position: fixed; bottom: 1.5rem; right: 1.5rem; width: 38px; height: 38px; border-radius: 50%; background: var(--bg3); border: 1px solid var(--border2); color: var(--text2); font-size: 1rem; cursor: pointer; display: none; align-items: center; justify-content: center; box-shadow: var(--shadow-lg); transition: all var(--ease); z-index: 40; }
    .scroll-top.visible { display: flex; }
    .scroll-top:hover { border-color: var(--accent); color: var(--accent); background: var(--bg4); }

    /* --- Responsive --- */
    @media (max-width: 900px) {
      .topbar-meta { display: none; }
      .hero { grid-template-columns: 1fr; }
      .donut-wrap { display: none; }
      .ai-grid { grid-template-columns: 1fr; }
      .container { padding: 0.7rem; }
      .filter-bar { position: static; }
    }
    @media (max-width: 600px) {
      .stats-grid { grid-template-columns: repeat(3, 1fr); }
      .scope-group { display: none; }
    }

    /* --- Docs Page --- */
    .doc-filter-bar{display:flex;flex-wrap:wrap;align-items:flex-start;gap:1rem;padding:0.8rem 1rem;background:var(--bg2);border-radius:10px;margin-bottom:1rem;border:1px solid var(--border)}
    .doc-filter-group{display:flex;flex-direction:column;gap:0.4rem}
    .doc-filter-label{font-size:0.7rem;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em}
    .doc-feature-checks{display:flex;flex-wrap:wrap;gap:0.3rem;max-width:420px}
    .doc-feature-check{display:flex;align-items:center;gap:0.3rem;font-size:0.75rem;color:var(--text2);background:var(--bg3);padding:3px 8px;border-radius:5px;cursor:pointer}
    .doc-feature-check input{accent-color:var(--accent);cursor:pointer}
    .doc-tabs{display:flex;gap:0.5rem;margin-bottom:0.75rem;border-bottom:1px solid var(--border);padding-bottom:0.5rem}
    .doc-tab-btn{background:none;border:none;color:var(--text2);padding:6px 14px;border-radius:6px 6px 0 0;cursor:pointer;font-size:0.82rem;font-weight:500;transition:background 0.15s}
    .doc-tab-btn.active{background:var(--accent);color:#fff}
    .doc-tab-btn:hover:not(.active){background:var(--bg3)}
    .doc-tab-panel{display:none}
    .doc-tab-panel.active{display:block}
    .doc-page-body{min-height:400px}
    .doc-pre{background:var(--bg2);color:var(--text1);padding:1.2rem 1.4rem;border-radius:8px;font-size:0.8rem;font-family:var(--font-mono);white-space:pre-wrap;word-break:break-word;border:1px solid var(--border);height:calc(100vh - 320px);min-height:400px;overflow-y:auto;margin:0}
    .doc-iframe{width:100%;height:calc(100vh - 320px);min-height:400px;border:1px solid var(--border);border-radius:8px;background:#fff}

    /* --- Print --- */
    @media print {
      body { background: #fff; color: #1a1a2e; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      :root { --bg:#fff; --bg2:#f8f9fc; --bg3:#eef0f5; --bg4:#e3e6ed; --border:#d4d8e2; --border2:#bcc1d0; --text:#111827; --text1:#1f2937; --text2:#4b5563; --text3:#6b7280; --pass:#059669; --fail:#dc2626; --skip:#4f46e5; --flaky:#d97706; --accent:#4f46e5; --accent2:#4338ca; --shadow:none; --shadow-lg:none; }
      .topbar { position: relative; background: #f8f9fc; border-bottom: 2px solid #e5e7eb; backdrop-filter: none; }
      .page-nav { display: none !important; }
      .page-panel { display: block !important; }
      .btn-sm, .scroll-top, .failure-banner, .section-actions { display: none !important; }
      .filter-bar { position: static; }
      .hero-title { background: none; -webkit-text-fill-color: #111827; color: #111827; }
      .section { page-break-inside: avoid; box-shadow: none; }
      .stat-card { box-shadow: none; }
      .stat-card:hover { transform: none; }
      .gallery-overlay { display: none !important; }
      a { color: inherit; text-decoration: none; }
      video { display: none; }
    }
  `;
}
