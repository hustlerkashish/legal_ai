#!/usr/bin/env node
/**
 * buildCaseIndex.cjs
 * ------------------
 * Scans the /pdfs directory and builds a lightweight JSON index
 * that the frontend uses to list / search / categorise judgments.
 *
 * Run:  node scripts/buildCaseIndex.cjs
 * Output:  public/cases.json
 */

const fs   = require('fs');
const path = require('path');

const PDF_DIR    = path.join(__dirname, '..', 'pdfs');
const OUT_FILE   = path.join(__dirname, '..', 'public', 'cases.json');

// ── helpers ────────────────────────────────────────────────────────
const MONTHS = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04',
  May: '05', Jun: '06', Jul: '07', Aug: '08',
  Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function parseDateStr(s) {
  // "24-Oct-2024" → "2024-10-24"
  const m = s.match(/(\d{2})-(\w{3})-(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${MONTHS[m[2]] || '00'}-${m[1]}`;
}

function parseFilename(name) {
  const base = name.replace(/\.pdf$/i, '');

  // Pattern A  — "supremecourt" long form
  // e.g. 10001-2023___supremecourt__2023__10001__10001_2023_13_1501_43156_Judgement_27-Mar-2023
  const scMatch = base.match(
    /^(\d+)-(\d{4})___supremecourt(?:_vernacular)?__(\d{4})__(\d+)__.*?(Judgement|Order)_(\d{2}-\w{3}-\d{4})(?:_(\w+))?$/
  );
  if (scMatch) {
    const caseNo  = scMatch[1];
    const year    = scMatch[2];
    const type    = scMatch[5]; // Judgement or Order
    const dateStr = parseDateStr(scMatch[6]);
    const lang    = scMatch[7] || null; // HIN, ORI, etc.
    return {
      id: `${caseNo}-${year}`,
      caseNo,
      year: parseInt(year),
      court: 'Supreme Court of India',
      type,
      date: dateStr,
      language: lang,
      source: 'supremecourt',
      filename: name,
    };
  }

  // Pattern B  — old "jonew__judis" form
  // e.g. -0___jonew__judis__10166  or 924-1996___jonew__judis__13013
  const jMatch = base.match(/^(-?\d+)(?:-(\d{4}))?___jonew__judis__(\d+)$/);
  if (jMatch) {
    const caseNo = jMatch[1];
    const year   = jMatch[2] ? parseInt(jMatch[2]) : null;
    return {
      id: `judis-${jMatch[3]}`,
      caseNo,
      year,
      court: 'Supreme Court of India',
      type: 'Judgement',
      date: null,
      language: null,
      source: 'judis',
      filename: name,
    };
  }

  // Pattern C — fallback: just record the file
  return {
    id: base,
    caseNo: base,
    year: null,
    court: 'Supreme Court of India',
    type: 'Judgement',
    date: null,
    language: null,
    source: 'unknown',
    filename: name,
  };
}

// ── main ───────────────────────────────────────────────────────────
console.log('Scanning', PDF_DIR, '…');
const files = fs.readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'));
console.log(`Found ${files.length} PDF files.`);

const cases = [];
const seen  = new Set();

for (const f of files) {
  const entry = parseFilename(f);
  // Skip vernacular duplicates for listing (keep them available but don't double-list)
  if (entry.language && entry.language !== 'ENG') {
    // still keep — users may want vernacular, but mark it
    entry.isVernacular = true;
  }
  // Deduplicate by id (keep the first occurrence)
  if (!seen.has(entry.id)) {
    seen.add(entry.id);
    cases.push(entry);
  }
}

// Sort by year descending, then by caseNo
cases.sort((a, b) => {
  if (b.year !== a.year) return (b.year || 0) - (a.year || 0);
  return (a.caseNo || '').localeCompare(b.caseNo || '');
});

// Compute stats for the UI
const years = [...new Set(cases.filter(c => c.year).map(c => c.year))].sort((a, b) => b - a);
const types = [...new Set(cases.map(c => c.type))];

const index = {
  generatedAt: new Date().toISOString(),
  totalCases: cases.length,
  years,
  types,
  cases,
};

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(index, null, 0)); // compact
const sizeMB = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(2);
console.log(`✅ Wrote ${OUT_FILE} (${sizeMB} MB, ${cases.length} entries)`);
