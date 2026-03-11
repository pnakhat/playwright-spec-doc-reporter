/**
 * Regenerates index.html from results.json + spec-doc-history.json.
 * Used by CI to rebuild the report after restoring history from cache.
 */
import { buildGlossyHtml } from 'playwright-spec-doc-reporter';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const results = JSON.parse(readFileSync('./spec-doc-report/results.json', 'utf8'));

const historyPath = './spec-doc-report/spec-doc-history.json';
const history = existsSync(historyPath)
  ? JSON.parse(readFileSync(historyPath, 'utf8'))
  : { schemaVersion: '1.0', runs: [] };

const html = buildGlossyHtml(results, { history });
writeFileSync('./spec-doc-report/index.html', html);

console.log(`Report regenerated — ${history.runs.length} history run(s) embedded.`);
