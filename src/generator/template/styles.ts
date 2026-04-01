export function getStyles(): string {
  return `
    :root {
      --bg: #0c0f17;
      --bg2: #191d2a;
      --bg3: #1a1e2e;
      --bg4: #121620;
      --bg5: #222739;
      --border: rgba(255,255,255,0.1);
      --border2: rgba(255,255,255,0.15);
      --border3: rgba(255,255,255,0.24);
      --text: #eef0f8;
      --text1: #d8dcee;
      --text2: #9299b4;
      --text3: #636b84;
      --pass: #0fba81;
      --fail: #f04040;
      --skip: #5b5ff0;
      --flaky: #f4a20a;
      --accent: #b0b8ff;
      --accent2: #7f87f7;
      --accent-glow: rgba(127,135,247,0.24);
      --radius: 16px;
      --radius-sm: 11px;
      --radius-xs: 7px;
      --shadow: 0 1px 3px rgba(0,0,0,0.5), 0 6px 24px rgba(0,0,0,0.28);
      --shadow-lg: 0 12px 48px rgba(0,0,0,0.55);
      --shadow-glow: 0 0 0 1px rgba(127,135,247,0.18), 0 4px 16px rgba(127,135,247,0.12);
      --font: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
      --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', Consolas, monospace;
      --ease: 0.18s cubic-bezier(0.4, 0, 0.2, 1);
      --ease-bounce: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
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
      font-variant-ligatures: common-ligatures;
    }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--border3); }

    /* --- Topbar --- */
    .topbar {
      background: rgba(8,11,18,0.96);
      border-bottom: 1px solid var(--border);
      padding: 0 1.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 56px;
      position: sticky;
      top: 0;
      z-index: 50;
      backdrop-filter: blur(32px) saturate(1.8);
      -webkit-backdrop-filter: blur(32px) saturate(1.8);
    }
    .topbar-brand { display: flex; align-items: center; gap: 11px; }
    .topbar-brand-text { display: flex; flex-direction: column; gap: 1px; }
    .topbar-brand-text #brand-title { font-weight: 800; font-size: 0.92rem; letter-spacing: -0.025em; line-height: 1.2; }
    .topbar-brand-subtitle { font-size: 0.67rem; color: var(--text3); font-weight: 500; letter-spacing: 0.01em; line-height: 1; }
    .topbar-logo {
      width: 32px; height: 32px;
      background: linear-gradient(135deg, #8b93ff, #6366f1, #7c3aed);
      border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px;
      box-shadow: 0 2px 14px rgba(99,102,241,0.5), 0 0 0 1px rgba(99,102,241,0.2);
    }
    .topbar-right { display: flex; align-items: center; gap: 0.75rem; }
    .topbar-meta { font-size: 0.72rem; color: var(--text2); display: flex; gap: 1.25rem; align-items: center; }
    .topbar-meta-item { display: flex; align-items: center; gap: 5px; }
    .topbar-meta-sep { width: 1px; height: 14px; background: var(--border2); }

    .btn-sm {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 13px; border-radius: 8px;
      border: 1px solid var(--border2);
      background: var(--bg3); color: var(--text2);
      font-size: 0.73rem; font-weight: 600; cursor: pointer;
      transition: all var(--ease);
      font-family: var(--font);
      letter-spacing: -0.01em;
    }
    .btn-sm:hover { border-color: var(--accent2); color: var(--text); background: var(--bg4); box-shadow: 0 0 0 1px rgba(127,135,247,0.1); }
    .btn-sm:active { transform: scale(0.97); }
    .btn-sm.btn-accent { background: linear-gradient(135deg, var(--accent2), #6366f1); color: #fff; border-color: transparent; box-shadow: 0 2px 8px rgba(99,102,241,0.35); }
    .btn-sm.btn-accent:hover { background: linear-gradient(135deg, var(--accent), var(--accent2)); box-shadow: 0 4px 14px rgba(99,102,241,0.45); }
    .btn-share { border-color: var(--border2); }
    .btn-export { background: linear-gradient(135deg, #7c3aed, #6366f1); color: #fff; border-color: transparent; box-shadow: 0 2px 8px rgba(99,102,241,0.4); font-weight: 700; }
    .btn-export:hover { background: linear-gradient(135deg, #8b5cf6, #7c3aed); box-shadow: 0 4px 14px rgba(99,102,241,0.5); color: #fff !important; }

    /* --- Failure banner --- */
    .failure-banner {
      background: linear-gradient(135deg, rgba(240,64,64,0.1), rgba(240,64,64,0.04));
      border-bottom: 1px solid rgba(240,64,64,0.16);
      padding: 0.48rem 1.75rem;
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      animation: bannerSlideDown 0.25s ease;
    }
    @keyframes bannerSlideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    .failure-banner.visible { display: flex; }
    .failure-banner-msg { color: #fca5a5; display: flex; align-items: center; gap: 8px; font-size: 0.82rem; font-weight: 600; }
    .failure-banner-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 13px; border-radius: 999px;
      background: rgba(240,64,64,0.16); color: #fca5a5;
      border: 1px solid rgba(240,64,64,0.28);
      font-size: 0.73rem; font-weight: 700; cursor: pointer;
      transition: all var(--ease); font-family: var(--font);
    }
    .failure-banner-btn:hover { background: rgba(240,64,64,0.28); border-color: rgba(240,64,64,0.48); color: #fff; }

    /* --- Container --- */
    .container { max-width: 1360px; margin: 0 auto; padding: 1.5rem 1.75rem; }

    /* --- Hero --- */
    .hero {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 2.25rem;
      align-items: start;
      margin-bottom: 1rem;
      padding: 2rem 2.25rem 1.75rem;
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
        radial-gradient(ellipse at 82% 20%, rgba(99,102,241,0.18) 0%, transparent 52%),
        radial-gradient(ellipse at 8% 90%, rgba(15,186,129,0.09) 0%, transparent 48%),
        radial-gradient(ellipse at 50% 120%, rgba(99,102,241,0.04) 0%, transparent 60%);
      pointer-events: none;
    }
    .hero::after {
      content: '';
      position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(127,135,247,0.3), transparent);
      pointer-events: none;
    }
    .hero-left { position: relative; }
    .hero-title {
      font-size: 1.9rem; font-weight: 900; letter-spacing: -0.045em; line-height: 1.12;
      background: linear-gradient(135deg, #eceff8 15%, #9da8ff 65%, #818cf8 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .hero-subtitle { color: var(--text3); font-size: 0.8rem; margin-top: 0.45rem; letter-spacing: 0.01em; }
    .hero-status {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 5px 13px; border-radius: 100px;
      font-size: 0.71rem; font-weight: 700; margin-top: 0.75rem;
      letter-spacing: 0.055em; text-transform: uppercase;
    }
    .hero-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .status-passed { background: rgba(15,186,129,0.12); color: var(--pass); border: 1px solid rgba(15,186,129,0.26); }
    .status-passed::before { background: var(--pass); box-shadow: 0 0 6px var(--pass); }
    .status-failed { background: rgba(240,64,64,0.12); color: var(--fail); border: 1px solid rgba(240,64,64,0.26); }
    .status-failed::before { background: var(--fail); box-shadow: 0 0 6px var(--fail); }
    .status-interrupted { background: rgba(244,162,10,0.12); color: var(--flaky); border: 1px solid rgba(244,162,10,0.26); }
    .status-interrupted::before { background: var(--flaky); box-shadow: 0 0 6px var(--flaky); }

    .env-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 1rem; }
    .env-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px; border-radius: 999px;
      font-size: 0.67rem; font-weight: 600;
      background: var(--bg3); border: 1px solid var(--border2); color: var(--text2);
      transition: border-color var(--ease);
    }
    .env-badge:hover { border-color: var(--border3); color: var(--text1); }

    /* --- Donut --- */
    .donut-wrap { position: relative; width: 136px; height: 136px; flex-shrink: 0; }
    .donut-wrap svg { transform: rotate(-90deg); filter: drop-shadow(0 0 10px rgba(15,186,129,0.15)); }
    .donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .donut-pct { font-size: 1.9rem; font-weight: 900; letter-spacing: -0.07em; line-height: 1; }
    .donut-label { font-size: 0.62rem; color: var(--text3); text-transform: uppercase; letter-spacing: 0.12em; margin-top: 3px; font-weight: 600; }

    /* --- Progress bar --- */
    .progress-section { margin-bottom: 1rem; }
    .progress-stack {
      height: 7px; border-radius: 999px; overflow: hidden;
      background: var(--bg4); display: flex; gap: 2px;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);
    }
    .progress-seg { height: 100%; transition: width 0.7s cubic-bezier(0.4, 0, 0.2, 1); }
    .progress-seg-pass { background: linear-gradient(90deg, #0fba81, #34d399); }
    .progress-seg-fail { background: linear-gradient(90deg, #f04040, #f87171); }
    .progress-seg-skip { background: linear-gradient(90deg, #5b5ff0, #818cf8); }
    .progress-seg-flaky { background: linear-gradient(90deg, #f4a20a, #fbbf24); }
    .progress-labels { display: flex; gap: 1.1rem; margin-top: 0.55rem; flex-wrap: wrap; }
    .progress-label { display: flex; align-items: center; gap: 6px; font-size: 0.68rem; color: var(--text2); font-weight: 500; }
    .progress-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .progress-label-count { font-weight: 700; color: var(--text1); margin-left: 2px; }

    /* --- Stats grid --- */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.6rem;
      margin-bottom: 1rem;
    }
    .stat-card {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.1rem 1.2rem;
      display: flex; flex-direction: column; gap: 4px;
      position: relative; overflow: hidden;
      box-shadow: var(--shadow);
      transition: border-color var(--ease), transform var(--ease), box-shadow var(--ease);
      cursor: default;
    }
    .stat-card:hover { border-color: var(--border2); transform: translateY(-3px); box-shadow: var(--shadow-lg); }
    .stat-card::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; }
    .stat-card.stat-pass::after { background: linear-gradient(90deg, var(--pass), #34d399); }
    .stat-card.stat-fail::after { background: linear-gradient(90deg, var(--fail), #f87171); }
    .stat-card.stat-skip::after { background: linear-gradient(90deg, var(--skip), #818cf8); }
    .stat-card.stat-flaky::after { background: linear-gradient(90deg, var(--flaky), #fbbf24); }
    .stat-card.stat-duration::after { background: linear-gradient(90deg, var(--accent2), var(--accent)); }
    .stat-card.stat-total::after { background: linear-gradient(90deg, var(--border3), var(--border2)); }
    .stat-card.stat-pass { border-top: 1px solid rgba(15,186,129,0.12); }
    .stat-card.stat-fail { border-top: 1px solid rgba(240,64,64,0.12); }
    .stat-icon { font-size: 1rem; margin-bottom: 2px; line-height: 1; opacity: 0.85; }
    .stat-value { font-size: 2.2rem; font-weight: 900; letter-spacing: -0.07em; line-height: 1; font-variant-numeric: tabular-nums; }
    .stat-label { font-size: 0.68rem; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }

    /* --- Section --- */
    .section {
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 1rem;
      overflow: hidden;
      box-shadow: var(--shadow);
    }
    .section-header {
      padding: 0.85rem 1.1rem;
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
      background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%);
    }
    .section-title { font-size: 0.9rem; font-weight: 700; display: flex; align-items: center; gap: 8px; letter-spacing: -0.01em; }
    .section-actions { display: flex; align-items: center; gap: 5px; }

    /* --- Tabs --- */
    .tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      padding: 0 1rem;
      background: linear-gradient(180deg, var(--bg3) 0%, var(--bg2) 100%);
      overflow-x: auto; scrollbar-width: none;
      gap: 2px;
    }
    .tabs::-webkit-scrollbar { display: none; }
    .tab-btn {
      padding: 0.7rem 1rem;
      font-size: 0.78rem; font-weight: 600;
      color: var(--text3);
      background: none; border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer; white-space: nowrap;
      margin-bottom: -1px;
      display: flex; align-items: center; gap: 6px;
      transition: color var(--ease);
      font-family: var(--font);
      letter-spacing: -0.01em;
    }
    .tab-btn:hover { color: var(--text2); }
    .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent2); }
    .tab-count {
      background: var(--bg4); color: var(--text3);
      font-size: 0.65rem; padding: 1px 7px;
      border-radius: 100px; font-weight: 700;
      transition: all var(--ease);
      min-width: 20px; text-align: center;
    }
    .tab-btn.active .tab-count { background: var(--accent-glow); color: var(--accent); }
    .tab-panel { display: none; }
    .tab-panel.active { display: block; }

    /* --- Filter bar --- */
    .filter-bar {
      padding: 0.75rem 1rem;
      display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;
      border-bottom: 1px solid var(--border);
      background: var(--bg3);
      position: sticky; top: 108px; z-index: 10;
    }
    .search-wrap { position: relative; flex: 1; min-width: 200px; }
    .search-icon { position: absolute; left: 0.65rem; top: 50%; transform: translateY(-50%); color: var(--text3); font-size: 0.85rem; pointer-events: none; line-height: 1; display: flex; align-items: center; }
    .search-input {
      width: 100%;
      padding: 0.45rem 0.75rem 0.45rem 2.1rem;
      background: var(--bg4);
      border: 1px solid var(--border2);
      border-radius: var(--radius-sm);
      color: var(--text); font-size: 0.85rem; font-family: var(--font);
      transition: border-color var(--ease), box-shadow var(--ease); outline: none;
    }
    .search-input:focus { border-color: var(--accent2); box-shadow: 0 0 0 3px rgba(127,135,247,0.1); }
    .search-input::placeholder { color: var(--text3); }
    .filter-group { display: flex; gap: 5px; }
    .filter-btn {
      padding: 0.35rem 0.85rem;
      border-radius: 7px;
      border: 1px solid var(--border2);
      background: var(--bg3); color: var(--text2);
      font-size: 0.72rem; font-weight: 700; cursor: pointer;
      transition: all var(--ease); font-family: var(--font); white-space: nowrap;
      letter-spacing: 0.02em;
    }
    .filter-btn:hover { border-color: var(--border3); color: var(--text); background: var(--bg4); }
    .filter-btn.active { background: var(--accent2); color: #fff; border-color: transparent; box-shadow: 0 2px 8px rgba(127,135,247,0.3); }

    /* Status filter — solid colored by default, brighter when active */
    .filter-btn-pass { background: var(--pass); color: #fff; border-color: transparent; opacity: 0.7; }
    .filter-btn-pass:hover { opacity: 1; background: var(--pass); color: #fff; box-shadow: 0 2px 10px rgba(15,186,129,0.4); }
    .filter-btn-pass.active { background: var(--pass); color: #fff; border-color: transparent; opacity: 1; box-shadow: 0 2px 10px rgba(15,186,129,0.5); }
    .filter-btn-fail { background: var(--fail); color: #fff; border-color: transparent; opacity: 0.7; }
    .filter-btn-fail:hover { opacity: 1; background: var(--fail); color: #fff; box-shadow: 0 2px 10px rgba(240,64,64,0.4); }
    .filter-btn-fail.active { background: var(--fail); color: #fff; border-color: transparent; opacity: 1; box-shadow: 0 2px 10px rgba(240,64,64,0.5); }
    .filter-btn-skip { background: var(--skip); color: #fff; border-color: transparent; opacity: 0.7; }
    .filter-btn-skip:hover { opacity: 1; background: var(--skip); color: #fff; box-shadow: 0 2px 10px rgba(91,95,240,0.4); }
    .filter-btn-skip.active { background: var(--skip); color: #fff; border-color: transparent; opacity: 1; box-shadow: 0 2px 10px rgba(91,95,240,0.5); }
    .filter-btn-flaky { background: var(--flaky); color: #fff; border-color: transparent; opacity: 0.7; }
    .filter-btn-flaky:hover { opacity: 1; background: var(--flaky); color: #fff; box-shadow: 0 2px 10px rgba(244,162,10,0.4); }
    .filter-btn-flaky.active { background: var(--flaky); color: #fff; border-color: transparent; opacity: 1; box-shadow: 0 2px 10px rgba(244,162,10,0.5); }
    .filter-divider { width: 1px; background: var(--border); margin: 0 4px; align-self: stretch; }

    /* --- Type filter --- */
    .type-btn { text-transform: uppercase; font-size: 0.68rem; letter-spacing: 0.05em; border-color: transparent; background: none; color: var(--text3); }
    .type-btn:hover { background: rgba(255,255,255,0.06); border-color: transparent; color: var(--text1); }
    .type-btn.active { color: #fff; }
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
    .suites-container { padding: 0.7rem; display: flex; flex-direction: column; gap: 0.45rem; }
    .suite-block {
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden; background: var(--bg3);
      transition: border-color var(--ease), box-shadow var(--ease);
    }
    .suite-block:hover { border-color: var(--border2); }
    .suite-block.suite-failed { border-left: 3px solid var(--fail); background: rgba(240,64,64,0.02); }
    .suite-block.suite-passed { border-left: 3px solid var(--pass); }
    .suite-header {
      padding: 0.65rem 0.95rem;
      display: flex; align-items: center; justify-content: space-between;
      cursor: pointer; gap: 0.75rem; user-select: none;
    }
    .suite-header:hover { background: rgba(255,255,255,0.03); }
    .suite-header-left { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
    .suite-header-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .suite-toggle { font-size: 0.58rem; color: var(--text3); transition: transform 0.22s cubic-bezier(0.4,0,0.2,1); display: inline-flex; flex-shrink: 0; }
    .suite-toggle.open { transform: rotate(90deg); }
    .suite-name { font-weight: 700; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em; }
    .suite-file { color: var(--text3); font-size: 0.68rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--font-mono); margin-top: 1px; }
    .suite-body { display: none; border-top: 1px solid var(--border); }
    .suite-body.open { display: block; animation: fadeIn 0.15s ease; }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }

    /* --- Badges --- */
    .badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 100px; font-size: 0.66rem; font-weight: 700; white-space: nowrap; }
    .badge-pass { background: rgba(15,186,129,0.13); color: var(--pass); border: 1px solid rgba(15,186,129,0.2); }
    .badge-fail { background: rgba(240,64,64,0.13); color: var(--fail); border: 1px solid rgba(240,64,64,0.2); }
    .badge-skip { background: rgba(91,95,240,0.13); color: var(--skip); border: 1px solid rgba(91,95,240,0.2); }
    .badge-flaky { background: rgba(244,162,10,0.13); color: var(--flaky); border: 1px solid rgba(244,162,10,0.2); }
    .badge-neutral { background: var(--bg4); color: var(--text2); border: 1px solid var(--border2); }

    /* --- Status icons --- */
    .status-icon { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; font-size: 0.62rem; font-weight: 800; flex-shrink: 0; }
    .status-passed-icon { background: rgba(15,186,129,0.14); color: var(--pass); }
    .status-failed-icon { background: rgba(240,64,64,0.14); color: var(--fail); }
    .status-skipped-icon { background: rgba(91,95,240,0.14); color: var(--skip); }

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
      margin-top: 0.45rem; padding: 0.55rem 0.75rem;
      background: rgba(240,64,64,0.06); border-radius: var(--radius-xs);
      border-left: 2px solid var(--fail); position: relative;
      border: 1px solid rgba(240,64,64,0.14); border-left: 3px solid var(--fail);
    }
    .test-error pre { font-size: 0.71rem; color: #fca5a5; white-space: pre-wrap; word-break: break-word; font-family: var(--font-mono); line-height: 1.65; }
    .copy-btn {
      position: absolute; top: 0.38rem; right: 0.38rem;
      padding: 2px 9px; border-radius: 5px;
      border: 1px solid rgba(240,64,64,0.26); background: rgba(240,64,64,0.1);
      color: #fca5a5; font-size: 0.62rem; font-weight: 700; cursor: pointer;
      transition: all var(--ease); font-family: var(--font);
    }
    .copy-btn:hover { background: rgba(240,64,64,0.2); border-color: rgba(240,64,64,0.42); }
    .copy-btn.copied { border-color: rgba(15,186,129,0.32); background: rgba(15,186,129,0.1); color: var(--pass); }

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
    .spec-pill { background: rgba(99,102,241,0.14); color: #818cf8; text-decoration: none; }
    .spec-pill:hover { background: rgba(99,102,241,0.28); }
    .healing-pill-healed { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .healing-pill-broken { background: rgba(239,68,68,0.13); color: var(--fail); }
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
    .manual-pill { background: rgba(168,85,247,0.13) !important; color: #a855f7 !important; }
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
    .ai-summary { padding: 0.85rem 1.1rem; color: var(--text2); font-size: 0.84rem; border-bottom: 1px solid var(--border); line-height: 1.65; }
    .ai-grid { display: grid; grid-template-columns: 1fr 1fr; }
    .ai-card { background: var(--bg2); padding: 1.1rem; border-right: 1px solid var(--border); }
    .ai-card:last-child { border-right: none; }
    .ai-card-title { font-size: 0.69rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text3); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 6px; }
    .finding-item { padding: 0.48rem 0.7rem; border-radius: var(--radius-xs); margin-bottom: 0.4rem; border-left: 2px solid; font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .finding-error { background: rgba(240,64,64,0.05); border-color: var(--fail); }
    .finding-warning { background: rgba(244,162,10,0.05); border-color: var(--flaky); }
    .finding-count { font-size: 0.67rem; padding: 1px 8px; border-radius: 999px; background: var(--bg4); color: var(--text2); font-weight: 700; flex-shrink: 0; }
    .ai-remediation { padding: 0.45rem 0.7rem; border-radius: var(--radius-xs); font-size: 0.79rem; color: var(--text1); line-height: 1.55; margin-bottom: 0.35rem; border: 1px solid var(--border); background: var(--bg3); display: flex; gap: 7px; transition: border-color var(--ease); }
    .ai-remediation:hover { border-color: var(--border2); }
    .ai-remediation-dot { color: var(--accent); font-weight: 700; flex-shrink: 0; margin-top: 1px; }
    .ai-disabled { padding: 2.5rem 1rem; text-align: center; color: var(--text2); }
    .ai-disabled-icon { font-size: 2.25rem; margin-bottom: 0.6rem; opacity: 0.45; }
    .ai-health-bar { height: 4px; background: var(--bg4); border-radius: 999px; overflow: hidden; }
    .ai-health-fill { height: 100%; border-radius: 999px; transition: width 0.6s ease; }
    .ai-insight { margin: 0.45rem 0; padding: 0.55rem 0.8rem; background: rgba(91,95,240,0.06); border-radius: var(--radius-xs); border-left: 2px solid var(--accent2); transition: background var(--ease); }
    .ai-insight:hover { background: rgba(91,95,240,0.09); }
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
    .bdd-summary-bar { display: flex; gap: 1.3rem; flex-wrap: wrap; padding: 0.75rem 1.1rem; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 1rem; box-shadow: var(--shadow); align-items: center; }
    .bdd-summary-item { display: flex; align-items: center; gap: 6px; font-size: 0.76rem; color: var(--text2); }
    .bdd-summary-value { font-weight: 800; color: var(--text); font-size: 0.9rem; font-variant-numeric: tabular-nums; }
    .bdd-summary-sep { width: 1px; height: 18px; background: var(--border2); margin: 0 0.2rem; }

    /* --- Multi-select filter --- */
    .filter-btn.active { background: var(--accent2); color: #fff; border-color: var(--accent2); box-shadow: 0 2px 8px rgba(127,135,247,0.35); }
    .filter-btn.active[data-filter="passed"] { background: rgba(15,186,129,0.18); color: var(--pass); border-color: rgba(15,186,129,0.35); box-shadow: none; }
    .filter-btn.active[data-filter="failed"] { background: rgba(240,64,64,0.18); color: var(--fail); border-color: rgba(240,64,64,0.35); box-shadow: none; }
    .filter-btn.active[data-filter="skipped"] { background: rgba(91,95,240,0.18); color: var(--skip); border-color: rgba(91,95,240,0.35); box-shadow: none; }
    .search-highlight { background: rgba(245,158,11,0.35); color: #fff; border-radius: 2px; padding: 0 1px; }
    .search-result-count { font-size: 0.68rem; color: var(--text3); margin-left: 0.5rem; white-space: nowrap; }

    /* --- Screenshots / Videos tab --- */
    .media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.7rem; padding: 0.9rem; }
    .media-card { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; cursor: pointer; transition: border-color var(--ease), transform var(--ease), box-shadow var(--ease); }
    .media-card:hover { border-color: var(--accent2); transform: translateY(-3px); box-shadow: var(--shadow-lg); }
    .media-card img, .media-card video { width: 100%; height: 155px; object-fit: cover; display: block; }
    .media-card-info { padding: 0.5rem 0.65rem; }
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

    /* --- AI Header Banner (AI Insights page) --- */
    .ai-header-banner {
      background: linear-gradient(135deg, rgba(30,25,70,0.95) 0%, rgba(20,18,55,0.9) 60%, rgba(15,15,35,0.95) 100%);
      border: 1px solid rgba(99,102,241,0.25);
      border-radius: var(--radius);
      padding: 1.5rem 1.75rem;
      margin-bottom: 1rem;
      position: relative; overflow: hidden;
    }
    .ai-header-banner::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(ellipse at 90% 0%, rgba(99,102,241,0.18) 0%, transparent 55%),
        radial-gradient(ellipse at 10% 100%, rgba(139,92,246,0.1) 0%, transparent 45%);
      pointer-events: none;
    }
    .ai-header-banner-inner { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; position: relative; }
    .ai-header-icon {
      width: 48px; height: 48px; border-radius: 12px;
      background: linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2));
      border: 1px solid rgba(99,102,241,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.4rem; flex-shrink: 0;
    }
    .ai-header-title { font-size: 1.15rem; font-weight: 800; letter-spacing: -0.02em; color: var(--accent); }
    .ai-header-subtitle { font-size: 0.77rem; color: var(--text3); margin-top: 0.15rem; }
    .ai-header-summary { font-size: 0.85rem; color: var(--text2); line-height: 1.7; position: relative; }

    /* AI Metric Cards Row */
    .ai-metric-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1rem; }
    @media (max-width: 900px) { .ai-metric-cards { grid-template-columns: 1fr; } }
    .ai-metric-card {
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius-sm); padding: 1.1rem 1.25rem;
      box-shadow: var(--shadow);
    }
    .ai-metric-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.6rem; }
    .ai-metric-label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.09em; color: var(--text3); }
    .ai-metric-conf { font-size: 0.65rem; font-weight: 700; color: var(--accent); background: rgba(127,135,247,0.1); border: 1px solid rgba(127,135,247,0.2); padding: 1px 7px; border-radius: 999px; }
    .ai-metric-value { font-size: 2rem; font-weight: 900; letter-spacing: -0.05em; line-height: 1.1; margin-bottom: 0.5rem; display: flex; align-items: baseline; gap: 6px; }
    .ai-metric-trend { font-size: 1rem; }
    .ai-metric-desc { font-size: 0.73rem; color: var(--text2); line-height: 1.55; }

    /* AI grid findings/recommendations */
    .ai-finding-row {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 0.6rem 0.75rem; border-radius: var(--radius-xs);
      background: rgba(255,255,255,0.025); border: 1px solid var(--border);
      margin-bottom: 0.4rem; transition: background var(--ease);
    }
    .ai-finding-row:last-child { margin-bottom: 0; }
    .ai-finding-row:hover { background: rgba(255,255,255,0.04); }
    .ai-finding-name { font-size: 0.82rem; font-weight: 600; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ai-finding-count { font-size: 0.7rem; font-weight: 700; background: rgba(240,64,64,0.15); color: var(--fail); border: 1px solid rgba(240,64,64,0.25); padding: 1px 8px; border-radius: 999px; flex-shrink: 0; }
    .ai-rec-row {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 0.55rem 0; border-bottom: 1px solid var(--border);
      font-size: 0.82rem; color: var(--text1); line-height: 1.55;
    }
    .ai-rec-row:last-child { border-bottom: none; }
    .ai-rec-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pass); flex-shrink: 0; margin-top: 6px; }

    /* --- Finding / Recommendation cards (legacy) --- */
    .finding-card {
      background: rgba(240,64,64,0.06); border-left: 3px solid var(--fail);
      padding: 0.72rem 0.85rem; border-radius: 0 var(--radius-xs) var(--radius-xs) 0; margin-bottom: 0.5rem;
    }
    .finding-card:last-child { margin-bottom: 0; }
    .recommendation-card {
      background: rgba(15,186,129,0.06); border-left: 3px solid var(--pass);
      padding: 0.72rem 0.85rem; border-radius: 0 var(--radius-xs) var(--radius-xs) 0; margin-bottom: 0.5rem;
    }
    .recommendation-card:last-child { margin-bottom: 0; }
    .finding-card-title, .recommendation-card-title { font-weight: 700; font-size: 0.84rem; margin-bottom: 0.15rem; }
    .finding-card-meta, .recommendation-card-meta { font-size: 0.73rem; color: var(--text2); }

    /* --- Test Health Metrics --- */
    .test-health-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 1.1rem;
    }
    .test-health-metric { display: flex; flex-direction: column; gap: 0.35rem; }
    .test-health-label { font-size: 0.68rem; text-transform: uppercase; color: var(--text2); letter-spacing: 0.07em; font-weight: 600; }
    .test-health-value { font-size: 1.6rem; font-weight: 900; letter-spacing: -0.05em; line-height: 1; }
    .test-health-bar { height: 4px; background: var(--bg4); border-radius: 999px; overflow: hidden; margin-top: 1px; }
    .test-health-bar-fill { height: 100%; border-radius: 999px; transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }

    /* --- Page nav --- */
    .page-nav {
      background: rgba(8,11,18,0.96);
      border-bottom: 1px solid var(--border);
      position: sticky; top: 56px; z-index: 40;
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
    }
    .page-nav { display: flex; padding: 0 1.75rem; gap: 2px; }
    .page-nav-btn {
      padding: 0.5rem 1rem;
      font-size: 0.82rem; font-weight: 600;
      color: var(--text3);
      background: none;
      border: 1px solid transparent;
      border-radius: 8px;
      cursor: pointer; white-space: nowrap;
      display: flex; align-items: center; gap: 6px;
      transition: color var(--ease), background var(--ease), border-color var(--ease);
      font-family: var(--font);
      letter-spacing: -0.01em;
      margin: 6px 2px;
    }
    .page-nav-btn:hover { color: var(--text2); background: rgba(255,255,255,0.04); }
    .page-nav-btn.active { color: var(--text); background: var(--bg3); border-color: var(--border2); box-shadow: 0 1px 4px rgba(0,0,0,0.3); }

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
    #docHtmlPreview { width: 100%; height: calc(100vh - 175px); min-height: 400px; border: none; display: block; background: #fff; }
    .doc-modal-footer { padding: 0.55rem 1rem; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 0.4rem; flex-shrink: 0; }

    /* --- Docs page header --- */
    .docs-page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 1rem; padding: 1.5rem 0 0.75rem;
    }
    .docs-page-header-left { display: flex; flex-direction: column; gap: 0.2rem; }
    .docs-page-title { font-size: 1.15rem; font-weight: 800; letter-spacing: -0.02em; display: flex; align-items: center; gap: 0.4rem; }
    .docs-page-subtitle { font-size: 0.77rem; color: var(--text3); }

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
    .trends-card-title { font-size: 0.82rem; font-weight: 700; color: var(--text2); letter-spacing: -0.01em; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 6px; }
    .trends-card-title-fail { color: var(--fail); }
    .trends-card-title-warn { color: var(--flaky); }
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

    /* Regression transition pills */
    .treg-transition { display: flex; align-items: center; gap: 5px; margin-top: 4px; }
    .treg-pill { font-size: 0.65rem; font-weight: 700; padding: 1px 8px; border-radius: 999px; }
    .treg-from-pass { background: rgba(15,186,129,0.15); color: var(--pass); border: 1px solid rgba(15,186,129,0.3); }
    .treg-from-skip { background: rgba(100,100,120,0.15); color: var(--text3); border: 1px solid var(--border2); }
    .treg-to-fail { background: rgba(240,64,64,0.15); color: var(--fail); border: 1px solid rgba(240,64,64,0.3); }
    .treg-to-pass { background: rgba(15,186,129,0.15); color: var(--pass); border: 1px solid rgba(15,186,129,0.3); }
    .treg-arrow { color: var(--text3); font-size: 0.75rem; }

    /* Performance change bars */
    .tperf-item { padding: 0.65rem 0; border-bottom: 1px solid var(--border); }
    .tperf-item:last-child { border-bottom: none; }
    .tperf-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
    .tperf-name { font-size: 0.82rem; font-weight: 600; color: var(--text1); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tperf-delta { font-size: 0.75rem; font-weight: 800; flex-shrink: 0; }
    .tperf-bar-row { display: flex; align-items: center; gap: 8px; }
    .tperf-bar-bg { flex: 1; height: 4px; background: var(--bg4); border-radius: 999px; overflow: hidden; }
    .tperf-bar-fill { height: 100%; border-radius: 999px; transition: width 0.5s ease; }
    .tperf-dur { font-size: 0.7rem; color: var(--text3); font-family: var(--font-mono); flex-shrink: 0; min-width: 36px; text-align: right; }

    /* Trends header */
    .trends-page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1.5rem 0 1rem; }
    .trends-page-title { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.03em; color: var(--text); }
    .trends-page-subtitle { font-size: 0.78rem; color: var(--text3); margin-top: 0.2rem; }

    /* --- Docs New Layout --- */
    .docs-new-toolbar {
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius-sm); padding: 0.55rem 1rem;
      display: flex; align-items: center; gap: 0.75rem;
      margin-bottom: 0.75rem; flex-wrap: wrap;
    }
    .docs-new-toolbar-left { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; flex: 1; }
    .docs-toolbar-section-label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text3); }
    .docs-features-badge {
      font-size: 0.7rem; font-weight: 700; color: var(--accent);
      background: rgba(127,135,247,0.12); border: 1px solid rgba(127,135,247,0.22);
      padding: 1px 9px; border-radius: 999px;
    }
    .docs-toolbar-sep { width: 1px; height: 18px; background: var(--border2); flex-shrink: 0; }
    .docs-format-group, .docs-view-group { display: flex; gap: 2px; }
    .docs-fmt-btn, .docs-view-btn {
      padding: 0.3rem 0.75rem; border-radius: 6px;
      border: 1px solid transparent;
      background: none; color: var(--text3);
      font-size: 0.73rem; font-weight: 600; cursor: pointer;
      transition: all var(--ease); font-family: var(--font);
    }
    .docs-fmt-btn:hover, .docs-view-btn:hover { color: var(--text2); background: rgba(255,255,255,0.04); }
    .docs-fmt-btn.active { background: var(--accent2); color: #fff; border-color: transparent; }
    .docs-view-btn.active { background: var(--bg3); color: var(--text); border-color: var(--border2); }

    /* Doc area */
    .docs-doc-area {
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius-sm); margin-bottom: 1rem; overflow: hidden;
    }
    .docs-doc-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.7rem 1rem; border-bottom: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%);
    }
    .docs-doc-header-left { display: flex; align-items: center; gap: 0.5rem; }
    .docs-doc-format-badge { font-size: 0.8rem; font-weight: 700; color: var(--text); }
    .docs-pre-new {
      margin: 0; padding: 1.25rem 1.5rem;
      font-size: 0.78rem; line-height: 1.7;
      font-family: var(--font-mono); color: var(--text1);
      white-space: pre-wrap; word-break: break-word;
      max-height: 480px; overflow-y: auto;
    }

    /* Feature Selection cards */
    .docs-feature-selection {
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius-sm); padding: 1rem 1.25rem;
    }
    .docs-feature-selection-header { margin-bottom: 0.75rem; }
    .docs-feature-sel-title { font-size: 0.92rem; font-weight: 700; color: var(--text); }
    .docs-feature-sel-subtitle { font-size: 0.73rem; color: var(--text3); margin-top: 0.15rem; }
    .docs-feature-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.5rem;
    }
    .docs-feature-card {
      display: flex; align-items: flex-start; gap: 10px;
      background: var(--bg3); border: 1px solid var(--border);
      border-radius: var(--radius-xs); padding: 0.7rem 0.85rem;
      cursor: pointer; transition: border-color var(--ease), background var(--ease);
    }
    .docs-feature-card:hover { border-color: var(--border2); }
    .docs-feature-card.selected { border-color: var(--accent2); background: rgba(127,135,247,0.06); }
    .docs-feature-card-check {
      width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0; margin-top: 1px;
      border: 1.5px solid var(--border3); background: var(--bg4);
      display: flex; align-items: center; justify-content: center;
      transition: all var(--ease); font-size: 0.6rem; color: #fff;
    }
    .docs-feature-card.selected .docs-feature-card-check { background: var(--accent2); border-color: var(--accent2); }
    .docs-feature-card-name { font-size: 0.82rem; font-weight: 700; color: var(--text1); line-height: 1.2; }
    .docs-feature-card-count { font-size: 0.7rem; color: var(--text3); margin-top: 2px; }

    /* --- Traceability Page --- */
    .treq-page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
    .treq-page-title { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.03em; color: var(--text); }
    .treq-page-subtitle { font-size: 0.77rem; color: var(--text3); margin-top: 0.2rem; }
    .treq-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; }
    @media (max-width: 900px) { .treq-stats-row { grid-template-columns: 1fr; } }
    .treq-stat-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 1rem 1.25rem; box-shadow: var(--shadow); }
    .treq-stat-label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.09em; color: var(--text3); margin-bottom: 0.5rem; }
    .treq-stat-value { font-size: 2rem; font-weight: 900; letter-spacing: -0.05em; line-height: 1.1; margin-bottom: 0.5rem; }
    .treq-stat-bar-bg { height: 4px; background: var(--bg4); border-radius: 999px; overflow: hidden; margin-top: 8px; }
    .treq-stat-bar-fill { height: 100%; border-radius: 999px; transition: width 0.6s ease; }
    .treq-cards-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .treq-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 1rem 1.25rem; box-shadow: var(--shadow); }
    .treq-card-pass { border-left: 3px solid var(--pass); }
    .treq-card-fail { border-left: 3px solid var(--flaky); }
    .treq-card-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 0.75rem; }
    .treq-card-header-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .treq-card-header-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .treq-req-num { font-size: 0.65rem; font-weight: 800; background: rgba(127,135,247,0.15); color: var(--accent); border: 1px solid rgba(127,135,247,0.25); padding: 1px 8px; border-radius: 4px; font-family: var(--font-mono); }
    .treq-req-name { font-size: 0.95rem; font-weight: 700; color: var(--text); }
    .treq-status-badge { font-size: 0.68rem; font-weight: 700; padding: 2px 9px; border-radius: 999px; }
    .treq-status-ok { background: rgba(15,186,129,0.12); color: var(--pass); border: 1px solid rgba(15,186,129,0.25); }
    .treq-status-fail { background: rgba(244,162,10,0.12); color: var(--flaky); border: 1px solid rgba(244,162,10,0.25); }
    .treq-status-partial { background: rgba(100,100,120,0.12); color: var(--text3); border: 1px solid var(--border2); }
    .treq-jira-link { font-size: 0.72rem; color: var(--accent); font-family: var(--font-mono); opacity: 0.85; }
    .treq-coverage-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .treq-coverage-label { font-size: 0.7rem; color: var(--text3); font-weight: 600; }
    .treq-coverage-pct { font-size: 0.7rem; font-weight: 800; color: var(--text2); }
    .treq-bar-bg { height: 4px; background: var(--bg4); border-radius: 999px; overflow: hidden; margin-bottom: 0.75rem; }
    .treq-bar-fill { height: 100%; border-radius: 999px; transition: width 0.6s ease; }
    .treq-tests-list { display: flex; flex-direction: column; gap: 2px; }
    .treq-test-row { display: flex; align-items: center; gap: 8px; padding: 0.38rem 0; border-top: 1px solid var(--border); }
    .treq-test-row:first-child { border-top: none; }
    .treq-test-circle { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .treq-circle-pass { background: var(--pass); }
    .treq-circle-fail { background: var(--fail); }
    .treq-circle-skip { background: var(--text3); }
    .treq-test-name { flex: 1; font-size: 0.8rem; color: var(--text1); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .treq-test-badge { font-size: 0.65rem; font-weight: 700; padding: 1px 8px; border-radius: 4px; flex-shrink: 0; }
    .treq-test-passed { background: rgba(15,186,129,0.12); color: var(--pass); }
    .treq-test-failed { background: rgba(240,64,64,0.12); color: var(--fail); }
    .treq-test-skip { background: rgba(100,100,120,0.12); color: var(--text3); }

    /* --- Footer --- */
    .footer { text-align: center; padding: 2rem 1.5rem 2.5rem; color: var(--text3); font-size: 0.7rem; display: flex; flex-direction: column; gap: 5px; align-items: center; border-top: 1px solid var(--border); margin-top: 0.5rem; }
    .footer-link { color: var(--text2); text-decoration: none; transition: color var(--ease); }
    .footer-link:hover { color: var(--accent); }

    /* --- Gallery --- */
    .gallery-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.88); display: none; align-items: center; justify-content: center; z-index: 200; padding: 1rem; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
    .gallery-overlay.open { display: flex; animation: fadeInOverlay 0.2s ease; }
    @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
    .gallery-panel { width: min(1100px, 96vw); max-height: 92vh; background: #07090e; border: 1px solid var(--border2); border-radius: 16px; overflow: hidden; display: grid; grid-template-rows: auto 1fr auto auto; box-shadow: 0 32px 96px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04); }
    .gallery-head { display: flex; align-items: center; justify-content: space-between; gap: 0.7rem; padding: 0.65rem 1rem; border-bottom: 1px solid var(--border); background: var(--bg2); }
    .gallery-head-left { display: flex; align-items: center; gap: 0.75rem; font-size: 0.78rem; color: var(--text2); }
    .gallery-close-btn { width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--border2); background: var(--bg3); color: var(--text2); font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all var(--ease); }
    .gallery-close-btn:hover { border-color: rgba(240,64,64,0.4); color: #fca5a5; background: rgba(240,64,64,0.1); }
    .gallery-body { min-height: 300px; display: flex; align-items: center; justify-content: center; background: #04060b; padding: 0.75rem; }
    .gallery-image { max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 6px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
    .gallery-video { max-width: 100%; max-height: 70vh; display: none; background: #000; border-radius: 6px; }
    .gallery-controls { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.65rem; border-top: 1px solid var(--border); background: var(--bg2); }
    .gallery-btn { padding: 0.3rem 0.9rem; border-radius: 999px; border: 1px solid var(--border2); background: var(--bg3); color: var(--text2); font-size: 0.73rem; cursor: pointer; transition: all var(--ease); font-family: var(--font); font-weight: 600; }
    .gallery-btn:hover { border-color: var(--accent2); color: var(--text); box-shadow: 0 0 0 1px rgba(127,135,247,0.1); }
    .gallery-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .gallery-hint { font-size: 0.63rem; color: var(--text3); text-align: center; padding: 0.2rem 0.65rem 0.45rem; background: var(--bg2); }

    /* --- Scroll to top --- */
    .scroll-top { position: fixed; bottom: 1.5rem; right: 1.5rem; width: 40px; height: 40px; border-radius: 50%; background: var(--bg3); border: 1px solid var(--border2); color: var(--text2); font-size: 1rem; cursor: pointer; display: none; align-items: center; justify-content: center; box-shadow: var(--shadow-lg); transition: all var(--ease-bounce); z-index: 40; }
    .scroll-top.visible { display: flex; animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
    @keyframes popIn { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
    .scroll-top:hover { border-color: var(--accent2); color: var(--accent); background: var(--bg4); transform: translateY(-2px); box-shadow: var(--shadow-glow); }

    /* --- Responsive --- */
    @media (max-width: 900px) {
      .topbar-meta { display: none; }
      .topbar { padding: 0 1rem; }
      .page-nav { padding: 0 1rem; }
      .hero { grid-template-columns: 1fr; padding: 1.5rem 1.5rem 1.4rem; }
      .donut-wrap { display: none; }
      .ai-grid { grid-template-columns: 1fr; }
      .container { padding: 0.75rem; }
      .filter-bar { position: static; }
    }
    @media (max-width: 600px) {
      .stats-grid { grid-template-columns: repeat(3, 1fr); }
      .scope-group { display: none; }
      .hero { padding: 1.25rem; }
      .hero-title { font-size: 1.55rem; }
    }

    /* --- Docs Page --- */
    .docs-toolbar { display:flex; align-items:center; justify-content:space-between; gap:0.75rem; flex-wrap:wrap; padding:0.6rem 0.9rem; background:var(--bg2); border:1px solid var(--border); border-radius:10px; margin-bottom:0.75rem; }
    .docs-toolbar-left  { display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; }
    .docs-toolbar-right { display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; }
    .docs-toolbar-label { font-size:0.7rem; font-weight:700; color:var(--text3); text-transform:uppercase; letter-spacing:0.05em; white-space:nowrap; }
    .docs-feature-dropdown { position:relative; }
    .docs-feature-trigger { display:inline-flex; align-items:center; gap:5px; }
    .docs-feature-count { display:inline-flex; align-items:center; justify-content:center; background:var(--accent2); color:#fff; font-size:0.62rem; font-weight:700; min-width:17px; height:17px; padding:0 4px; border-radius:99px; }
    .docs-feature-panel { display:none; position:absolute; top:calc(100% + 6px); left:0; z-index:100; background:var(--bg2); border:1px solid var(--border2); border-radius:10px; box-shadow:var(--shadow-lg); padding:0.7rem; min-width:220px; max-width:320px; }
    .docs-feature-panel.open { display:block; }
    .docs-feature-panel-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:0.5rem; }
    .doc-feature-checks { display:flex; flex-direction:column; gap:3px; max-height:220px; overflow-y:auto; }
    .doc-feature-check { display:flex; align-items:center; gap:0.4rem; font-size:0.78rem; color:var(--text2); padding:4px 6px; border-radius:5px; cursor:pointer; transition:background var(--ease); }
    .doc-feature-check:hover { background:var(--bg3); }
    .doc-feature-check input { accent-color:var(--accent); cursor:pointer; flex-shrink:0; }
    .doc-view-tabs { display:flex; gap:2px; background:var(--bg3); border-radius:7px; padding:2px; }
    .doc-tab-btn { background:none; border:none; color:var(--text3); padding:4px 12px; border-radius:5px; cursor:pointer; font-size:0.75rem; font-weight:600; transition:all 0.12s; font-family:var(--font); white-space:nowrap; }
    .doc-tab-btn.active { background:var(--bg2); color:var(--text); box-shadow:0 1px 4px rgba(0,0,0,0.12); }
    .doc-tab-btn:hover:not(.active) { color:var(--text2); }
    .doc-tab-panel { display:none; }
    .doc-tab-panel.active { display:block; }
    .doc-page-body { min-height:400px; }
    .doc-pre { background:var(--bg2); color:var(--text1); padding:1.2rem 1.4rem; border-radius:8px; font-size:0.8rem; font-family:var(--font-mono); white-space:pre-wrap; word-break:break-word; border:1px solid var(--border); height:calc(100vh - 175px); min-height:400px; overflow-y:auto; margin:0; }
    .doc-iframe { width:100%; height:calc(100vh - 175px); min-height:400px; border:1px solid var(--border); border-radius:8px; background:#fff; }

    /* --- Light theme --- */
    [data-theme="light"] {
      --bg: #f3f5fb;
      --bg2: #ffffff;
      --bg3: #eceef6;
      --bg4: #e2e5f0;
      --bg5: #d5d9ea;
      --border: rgba(0,0,0,0.08);
      --border2: rgba(0,0,0,0.13);
      --border3: rgba(0,0,0,0.22);
      --text: #0f1729;
      --text1: #1e2640;
      --text2: #4a5270;
      --text3: #697090;
      --pass: #079668;
      --fail: #d92626;
      --skip: #4a42e0;
      --flaky: #d08a06;
      --accent: #4a42e0;
      --accent2: #3d36c4;
      --accent-glow: rgba(74,66,224,0.13);
      --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05);
      --shadow-lg: 0 8px 32px rgba(0,0,0,0.1);
      --shadow-glow: 0 0 0 1px rgba(74,66,224,0.14), 0 4px 16px rgba(74,66,224,0.08);
    }
    [data-theme="light"] .topbar {
      background: rgba(243,245,251,0.97);
      border-bottom: 1px solid var(--border2);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    [data-theme="light"] .page-nav {
      background: rgba(236,238,246,0.97);
      border-bottom: 1px solid var(--border2);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }
    [data-theme="light"] .hero {
      background: linear-gradient(135deg, #ffffff 0%, #f3f5ff 100%);
    }
    [data-theme="light"] .hero-title {
      background: linear-gradient(135deg, #1e1b6e, #4a42e0, #6d28d9);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    [data-theme="light"] .hero::after {
      background: linear-gradient(90deg, transparent, rgba(74,66,224,0.2), transparent);
    }
    [data-theme="light"] ::-webkit-scrollbar-thumb { background: var(--border2); }
    [data-theme="light"] ::-webkit-scrollbar-thumb:hover { background: var(--border3); }
    [data-theme="light"] .gallery-panel { background: #fff; }
    [data-theme="light"] .gallery-body { background: #f1f3f9; }
    [data-theme="light"] .tabs { background: linear-gradient(180deg, var(--bg3) 0%, var(--bg2) 100%); }
    [data-theme="light"] .section-header { background: linear-gradient(180deg, rgba(0,0,0,0.015) 0%, transparent 100%); }

    /* --- Flakiness badges --- */
    .flakiness-badge {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 0.65rem; font-weight: 700; padding: 2px 6px;
      border-radius: 5px; white-space: nowrap; vertical-align: middle;
      font-family: var(--font-mono);
    }
    .flakiness-badge.flaky-high   { background: rgba(239,68,68,0.14); color: #ef4444; border: 1px solid rgba(239,68,68,0.25); }
    .flakiness-badge.flaky-medium { background: rgba(245,158,11,0.14); color: #f59e0b; border: 1px solid rgba(245,158,11,0.25); }
    .flakiness-badge.flaky-low    { background: rgba(245,158,11,0.08); color: #d97706; border: 1px solid rgba(245,158,11,0.18); }
    .flakiness-score-card { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    .flakiness-bar-wrap { flex: 1; height: 4px; background: var(--bg4); border-radius: 2px; overflow: hidden; }
    .flakiness-bar { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
    .flakiness-bar.flaky-high   { background: #ef4444; }
    .flakiness-bar.flaky-medium { background: #f59e0b; }
    .flakiness-bar.flaky-low    { background: #d97706; }
    .flakiness-bar.flaky-stable { background: #10b981; }

    /* --- Theme toggle button --- */
    .btn-theme-toggle {
      width: 32px; height: 32px; border-radius: 8px; padding: 0;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.9rem; border: 1px solid var(--border2);
      background: var(--bg3); color: var(--text2); cursor: pointer;
      transition: all var(--ease);
    }
    .btn-theme-toggle:hover { border-color: var(--accent2); color: var(--accent); background: var(--bg4); box-shadow: 0 0 0 1px rgba(127,135,247,0.1); }

    /* --- Print --- */
    @media print {
      body { background: #fff; color: #1a1a2e; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      :root { --bg:#fff; --bg2:#f8f9fc; --bg3:#edf0f7; --bg4:#e1e6f0; --border:#d2d6e4; --border2:#b8bece; --text:#0f1729; --text1:#1e2640; --text2:#4a5270; --text3:#697090; --pass:#079668; --fail:#d92626; --skip:#4a42e0; --flaky:#d08a06; --accent:#4a42e0; --accent2:#3d36c4; --shadow:none; --shadow-lg:none; --shadow-glow:none; }
      .topbar { position: relative; background: #f8f9fc; border-bottom: 2px solid #e2e6f0; backdrop-filter: none; }
      .page-nav { display: none !important; }
      .page-panel { display: block !important; }
      .btn-sm, .scroll-top, .failure-banner, .section-actions { display: none !important; }
      .filter-bar { position: static; }
      .hero::after { display: none; }
      .hero-title { background: none; -webkit-text-fill-color: #0f1729; color: #0f1729; }
      .section { page-break-inside: avoid; box-shadow: none; }
      .stat-card { box-shadow: none; }
      .stat-card:hover { transform: none; }
      .gallery-overlay { display: none !important; }
      a { color: inherit; text-decoration: none; }
      video { display: none; }
      .footer { border-top: 1px solid #e2e6f0; }
    }
  `;
}
