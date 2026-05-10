#!/usr/bin/env node
// Fails when tracked Markdown files contain U+2014 (em) or U+2013 (en) characters.
// Walks SKILL.md, README.md, CONTRIBUTING.md, CHANGELOG.md, and references/**/*.md.
// Skips fenced code blocks, this script itself, node_modules, and .git.
// ESM, stdlib only. Run: node scripts/check-no-dashes.mjs
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EM = '—';
const EN = '–';

async function findRoot(start) {
  let dir = start;
  // Walk up looking for package.json (preferred) or .git (fallback for skill repos).
  for (;;) {
    for (const marker of ['package.json', '.git']) {
      try {
        await stat(join(dir, marker));
        return dir;
      } catch { /* keep searching */ }
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error('repo root not found');
    dir = parent;
  }
}

async function* walk(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && e.name.endsWith('.md')) yield full;
  }
}

async function collectFiles(root) {
  const out = [];
  for (const top of ['SKILL.md', 'README.md', 'CONTRIBUTING.md', 'CHANGELOG.md']) {
    try { await stat(join(root, top)); out.push(join(root, top)); } catch { /* missing is fine */ }
  }
  for await (const p of walk(join(root, 'references'))) out.push(p);
  return out;
}

function scan(text) {
  const hits = [];
  let inFence = false;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Toggle on any line whose first non-space content is a triple backtick fence.
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === EM) hits.push({ line: i + 1, col: c + 1, kind: 'EM' });
      else if (ch === EN) hits.push({ line: i + 1, col: c + 1, kind: 'EN' });
    }
  }
  return hits;
}

async function main() {
  const root = await findRoot(HERE);
  const selfRel = relative(root, fileURLToPath(import.meta.url));
  const files = (await collectFiles(root)).filter(f => relative(root, f) !== selfRel);
  const results = await Promise.all(files.map(async f => ({ file: f, hits: scan(await readFile(f, 'utf8')) })));
  let totalHits = 0, filesWithHits = 0;
  for (const r of results) {
    if (!r.hits.length) continue;
    filesWithHits++;
    totalHits += r.hits.length;
    const rel = relative(root, r.file).split(sep).join('/');
    for (const h of r.hits) process.stderr.write(`${rel}:${h.line}:${h.col}: ${h.kind} dash\n`);
  }
  if (totalHits === 0) {
    process.stdout.write(`check-no-dashes: OK (${files.length} files scanned)\n`);
    process.exit(0);
  }
  process.stderr.write(`check-no-dashes: FAIL (${totalHits} hits in ${filesWithHits} files)\n`);
  process.exit(1);
}

main().catch(err => { process.stderr.write(`check-no-dashes: ERROR ${err.message}\n`); process.exit(2); });
