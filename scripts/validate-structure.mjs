#!/usr/bin/env node
// Structural validator for skill-frontend-excellence.
// Enforces the navigation + frontmatter contract that the skill's determinism rests on:
//   1. Every references/*.md has complete, well-formed YAML frontmatter (7 fields).
//   2. load-when.task-keywords / load-when.symptoms are drawn from the closed vocabulary below.
//   3. title matches the file's H1.
//   4. related: lists 2 to 4 sibling files that all resolve.
//   5. size: matches actual line count (auto-fixed with --fix, else a failure).
//   6. SKILL.md routing integrity: every reference file appears in the Reference Index AND in
//      at least one of the By-Task / By-Symptom tables (no orphan); every routed link resolves;
//      every section-pointer anchor (#slug) resolves to a real heading in the target file.
//
// ESM, stdlib only. Run: node scripts/validate-structure.mjs [--fix]
// Exit 0 = clean. Exit 1 = one or more violations (or a size drift in non-fix mode).

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = process.argv.includes('--fix');
const SIZE_TOLERANCE = 8; // lines; size: drift beyond this is a violation (auto-fixed with --fix)

// ---------------------------------------------------------------------------
// Closed vocabulary. Single source of truth, mirrored for humans in CONTRIBUTING.md.
// Adding a keyword/symptom to a reference file requires adding it here in the same change.
// ---------------------------------------------------------------------------
const TASK_KEYWORDS = new Set([
  // Core Web Vitals and perf
  'LCP', 'INP', 'CLS', 'TTFB', 'FCP', 'TBT', 'performance', 'hydration', 'bundle', 'preload',
  'prefetch', 'Speculation Rules', 'Early Hints', 'fetchpriority', 'BFCache', 'render strategy',
  'SSR', 'SSG', 'CSR', 'ISR', 'streaming', 'islands', 'partial hydration', 'resumable',
  // Accessibility
  'accessibility', 'a11y', 'WCAG', 'screen reader', 'keyboard', 'focus', 'contrast',
  'semantic HTML', 'ARIA', 'dynamic type', 'reduced motion', 'forced colors', 'axe', 'inline SVG',
  // SEO
  'SEO', 'indexing', 'canonical', 'sitemap', 'robots', 'structured data', 'JSON-LD', 'AEO', 'GEO',
  'llms.txt', 'hreflang', 'Open Graph', 'meta description', 'title tag', 'clean URLs',
  // UI / UX
  'UI', 'UX', 'interaction', 'hover', 'press', 'loading state', 'error state', 'empty state',
  'success state', 'modal', 'popover', 'dialog', 'drawer', 'sheet', 'menu', 'tooltip', 'snackbar',
  'toast', 'breadcrumb', 'navigation', 'touch target', 'hit target', 'popover API', 'inert',
  // Design
  'design', 'typography', 'color', 'palette', 'OKLCH', 'P3', 'wide gamut', 'spacing', 'composition',
  'atmosphere', 'dark mode', 'light mode', 'brand', 'font', 'variable font',
  // Responsive
  'responsive', 'breakpoint', 'mobile', 'tablet', 'desktop', 'container query', 'viewport',
  'safe area', 'dvh', 'srcset', 'DPR', 'fluid typography', 'subgrid', 'scrollbar-gutter',
  // Motion
  'motion', 'animation', 'transition', 'easing', 'View Transitions', 'scroll-driven', 'WAAPI',
  'will-change', '@starting-style',
  // Forms
  'form', 'validation', 'autofill', 'autocomplete', 'label', 'input', 'select', 'checkbox',
  'radio', 'file upload', 'constraintValidation',
  // Data viz
  'chart', 'data viz', 'axis', 'legend', 'colorblind', 'Canvas', 'SVG', 'WebGL', 'timezone', 'DST',
  // Pre-launch
  'pre-launch', 'checklist', 'ship', 'release', 'deployment', 'gate', 'verification', 'evidence',
  // Audit / polish
  'audit', 'route', 'sweep', 'screenshot', 'baseline', 'capture', 'polish', 'drift', 'measurable bars',
  // Components
  'component', 'widget', 'contract', 'extraction', 'slots', 'composition', 'Storybook', 'tokens',
  // Defects
  'defect', 'bug', 'regression', 'geometry', 'threshold',
  // Security
  'security', 'CSP', 'COOP', 'COEP', 'CORP', 'cross-origin isolation', 'SRI', 'Trusted Types',
  'Permissions-Policy', 'Referrer-Policy', 'frame-ancestors',
  // Observability
  'observability', 'RUM', 'monitoring', 'error capture', 'source maps', 'INP attribution',
  'Reporting API', 'error boundary', 'CrUX', 'Long Animation Frames', 'LoAF',
  // Testing
  'testing', 'visual regression', 'axe-core', 'pa11y', 'size-limit', 'bundlesize', 'lighthouse-ci',
  'contract test', 'type check', 'hermetic gate',
  // Lighthouse (audit-id space)
  'lighthouse', 'diagnostic Insights', 'phantom failure', 'errors-in-console', 'image-size-responsive',
  // Auth
  'auth', 'authentication', 'login', 'signup', 'passkey', 'WebAuthn', 'OAuth', 'magic link',
  'session', 'account recovery', 'CAPTCHA', 'Turnstile', 'Storage Access API',
  // Debug
  'debug', 'recipe', 'hydration mismatch', 'layout overflow', 'focus trap', 'font-swap CLS',
  // Anti-patterns
  'anti-pattern', 'what to avoid', 'mistake',
  // i18n
  'i18n', 'l10n', 'internationalization', 'localization', 'locale', 'translation', 'Intl',
  'plural rules', 'bidi', 'RTL', 'mirroring',
  // PWA / offline
  'PWA', 'offline', 'service worker', 'SW', 'install prompt', 'push', 'background sync', 'manifest',
  // Build hygiene
  'build', 'tree-shaking', 'dependency', 'sideEffects', 'lockfile', 'dead code', 'code splitting',
  // Embed patterns
  'embed', 'iframe', 'sandbox', 'postMessage', 'host', 'guest', 'third-party widget',
  // Print / email
  'print', 'email', '@page', 'page-break', 'transactional email', 'Outlook',
  // Quick reference
  'rule', 'quick reference', 'highest leverage',
]);

const SYMPTOMS = new Set([
  'LCP > 2.5s', 'LCP regression', 'INP > 200ms', 'INP regression', 'CLS > 0.1', 'CLS regression',
  'slow page', 'slow interaction', 'score dropped', 'Lighthouse score drop', 'bundle size grew',
  'hydration mismatch', 'focus trap leak', 'duplicate id', 'horizontal scroll', 'viewport overflow',
  'broken on Firefox', 'broken on Safari', 'font swap CLS', 'iOS 100vh', 'rubber-band scroll',
  'third-party script slow', 'focus not visible', 'contrast fail', 'aria-hidden leak', 'inert leak',
  'noindex with sitemap', 'canonical mismatch', 'consent banner CLS', 'popover not dismissing',
  'scroll lock side shift', 'auth redirect loop', 'passkey not offered', 'RTL broken',
  'dark mode broken',
  // new with v0.3.0 additions
  'phantom dev failure', 'errors-in-console', 'image too small on retina', 'stale SRI beacon',
]);

const REQUIRED_FM = ['title', 'purpose', 'load-when', 'prereq', 'related', 'size'];

const errors = [];
const fixes = [];
function err(file, msg) { errors.push(`${file}: ${msg}`); }

function slugify(heading) {
  // GitHub-flavored heading anchor: lowercase, drop anything not alnum/space/hyphen, spaces->hyphens.
  return heading.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
}

function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---', 4);
  if (end === -1) return null;
  return text.slice(4, end);
}

// Tiny purpose-built YAML reader for our fixed schema (avoids a dep).
function readField(fm, name) {
  const m = fm.match(new RegExp(`^\\s*${name}:\\s*(.*)$`, 'm'));
  return m ? m[1].trim() : null;
}
function readListField(fm, name) {
  // inline [a, b] form (allow leading indentation for nested keys)
  const inline = fm.match(new RegExp(`^\\s*${name}:\\s*\\[(.*)\\]\\s*$`, 'm'));
  if (inline) return inline[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  return null;
}
function readNestedList(fm, parent, child) {
  const re = new RegExp(`^${parent}:\\s*\\n((?:[ \\t]+.*\\n?)+)`, 'm');
  const block = fm.match(re);
  if (!block) return null;
  return readListField(block[1], child);
}

function headings(text) {
  return [...text.matchAll(/^##+\s+(.*)$/gm)].map((m) => m[1].trim());
}

async function main() {
  const root = dirname(HERE); // scripts/ -> repo root
  const refDir = join(root, 'references');
  const refFiles = (await readdir(refDir)).filter((f) => f.endsWith('.md')).sort();

  // --- per-file frontmatter validation ---
  const headingsByFile = {};
  for (const f of refFiles) {
    const path = join(refDir, f);
    const text = await readFile(path, 'utf8');
    headingsByFile[f] = new Set(headings(text).map(slugify));
    const fm = parseFrontmatter(text);
    if (!fm) { err(f, 'missing or malformed YAML frontmatter block'); continue; }

    for (const field of REQUIRED_FM) {
      if (!new RegExp(`^${field}:`, 'm').test(fm)) err(f, `frontmatter missing required field: ${field}`);
    }

    const title = readField(fm, 'title');
    const h1 = (text.match(/^#\s+(.*)$/m) || [])[1];
    if (title && h1 && title.trim() !== h1.trim()) err(f, `title "${title}" does not match H1 "${h1}"`);

    const tks = readNestedList(fm, 'load-when', 'task-keywords') || [];
    const syms = readNestedList(fm, 'load-when', 'symptoms') || [];
    if (tks.length < 6 || tks.length > 12) err(f, `task-keywords count ${tks.length} outside 6..12`);
    if (syms.length < 3 || syms.length > 8) err(f, `symptoms count ${syms.length} outside 3..8`);
    for (const k of tks) if (!TASK_KEYWORDS.has(k)) err(f, `task-keyword not in closed vocabulary: "${k}"`);
    for (const s of syms) if (!SYMPTOMS.has(s)) err(f, `symptom not in closed vocabulary: "${s}"`);

    const related = readListField(fm, 'related') || [];
    if (related.length < 2 || related.length > 4) err(f, `related count ${related.length} outside 2..4`);
    for (const r of related) {
      if (!refFiles.includes(r)) err(f, `related points at missing file: ${r}`);
    }

    // size: actual line count
    const actual = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
    const sizeRaw = readField(fm, 'size') || '';
    const declared = parseInt((sizeRaw.match(/(\d+)/) || [])[1] || '0', 10);
    if (Math.abs(declared - actual) > SIZE_TOLERANCE) {
      if (FIX) {
        const fixed = text.replace(/^size:.*$/m, `size: ~${actual} lines`);
        await writeFile(path, fixed);
        fixes.push(`${f}: size ~${declared} -> ~${actual}`);
      } else {
        err(f, `size: ~${declared} but actual ${actual} (drift > ${SIZE_TOLERANCE}; run --fix)`);
      }
    }
  }

  // --- SKILL.md routing integrity ---
  const skillPath = join(root, 'SKILL.md');
  const skill = await readFile(skillPath, 'utf8');
  const section = (name) => {
    // No 'm' flag: `$` must mean end-of-string so the body runs to the next "## " or EOF,
    // not end-of-first-line.
    const re = new RegExp(`## ${name}[\\s\\S]*?(?=\\n## |$)`);
    return (skill.match(re) || [''])[0];
  };
  const linkTargets = (s) => [...s.matchAll(/\]\(references\/([a-z0-9-]+\.md)(#[a-z0-9-]+)?\)/g)]
    .map((m) => ({ file: m[1], anchor: m[2] ? m[2].slice(1) : null }));

  const byTask = section('Routing: by task');
  const bySymptom = section('Routing: by symptom');
  const refIndex = section('Reference Index');

  const taskFiles = new Set(linkTargets(byTask).map((t) => t.file));
  const symFiles = new Set(linkTargets(bySymptom).map((t) => t.file));
  const indexFiles = new Set(linkTargets(refIndex).map((t) => t.file));

  for (const f of refFiles) {
    if (!indexFiles.has(f)) err('SKILL.md', `Reference Index missing row for ${f}`);
    if (!taskFiles.has(f) && !symFiles.has(f)) err('SKILL.md', `${f} is orphaned (not in By-Task nor By-Symptom)`);
  }
  // every routed link resolves + every section anchor resolves
  for (const part of [byTask, bySymptom, refIndex]) {
    for (const { file, anchor } of linkTargets(part)) {
      if (!refFiles.includes(file)) { err('SKILL.md', `routing link to missing file: ${file}`); continue; }
      if (anchor && !headingsByFile[file].has(anchor)) {
        err('SKILL.md', `section pointer #${anchor} does not match any heading in ${file}`);
      }
    }
  }
  // By-Symptom must use markdown links, not bare backtick file names
  if (/`[a-z0-9-]+\.md`/.test(bySymptom)) {
    err('SKILL.md', 'By-Symptom table still uses backtick file names; use markdown links to references/*.md');
  }

  // --- report ---
  for (const fx of fixes) process.stdout.write(`fixed: ${fx}\n`);
  if (errors.length) {
    process.stderr.write(`\nvalidate-structure: ${errors.length} violation(s):\n`);
    for (const e of errors) process.stderr.write(`  - ${e}\n`);
    process.exit(1);
  }
  process.stdout.write(`validate-structure: ok (${refFiles.length} reference files, frontmatter + routing intact)\n`);
}

main().catch((e) => { process.stderr.write(`validate-structure failed: ${e.stack}\n`); process.exit(1); });
