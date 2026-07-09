#!/usr/bin/env node
// Inline app-screen components into pages, replacing the old <iframe> embeds.
//
// Pages carry marker comments:
//     <!--screen:NAME:start-->        ...generated .au / .ped-doc markup...  <!--screen:NAME:end-->
//     <!--screen:NAME:start:show-->   (adds the `show` class -> visible screen in a switcher stack)
//
// For each marker the script extracts the screen root (`.preview-phone > .au`, or `.ped-doc`
// for pedigree-record) from components/NAME.html, sets data-screen="NAME", and rewrites the
// content between the markers. Deterministic + idempotent: re-running produces no diff.
// components/*.html stay the single source of truth and are never modified here.
//
// Usage:  node scripts/inline-screens.mjs          (rewrite pages in place)
//         node scripts/inline-screens.mjs --check   (exit 1 if any page is stale; no writes)
//
// Dependency-free on purpose: the repo lives in Dropbox, so we avoid a node_modules tree.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

// Pages that contain screen markers.
const PAGES = ['features/index.html', 'about/index.html', 'components/index.html'];

// <!--screen:NAME:start--> or <!--screen:NAME:start:show-->  ...  <!--screen:NAME:end-->
// Group 1: leading indent, 2: name, 3: optional ":show".
const MARKER = /([ \t]*)<!--screen:([a-z0-9-]+):start(:show)?-->[\s\S]*?<!--screen:\2:end-->/g;

// Extract the screen root element from a component file by walking <div> depth.
function extractScreen(name) {
  const file = join(ROOT, 'components', `${name}.html`);
  const html = readFileSync(file, 'utf8');

  // Root: `.ped-doc` for the pedigree artifact, else the `.au` inside `.preview-phone`.
  let from = 0;
  let opener;
  if (name === 'pedigree-record') {
    opener = /<div class="ped-doc[ "]/g;
  } else {
    const pp = html.indexOf('class="preview-phone"');
    if (pp < 0) throw new Error(`components/${name}.html: no .preview-phone wrapper`);
    from = pp;
    opener = /<div class="au[ "]/g; // matches `au` / `au dark`, not `au-*`
  }
  opener.lastIndex = from;
  const open = opener.exec(html);
  if (!open) throw new Error(`components/${name}.html: screen root element not found`);

  // Walk <div>/</div> depth from the opening tag to its matching close.
  const tag = /<(\/?)div\b/g;
  tag.lastIndex = open.index;
  let depth = 0;
  let m;
  while ((m = tag.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) {
      const end = html.indexOf('>', m.index) + 1;
      return html.slice(open.index, end);
    }
  }
  throw new Error(`components/${name}.html: unbalanced <div> around screen root`);
}

// Inject data-screen (and optional `show` class) into the root element's opening tag.
function decorate(el, name, show) {
  const gt = el.indexOf('>');
  let openTag = el.slice(0, gt);
  const rest = el.slice(gt);
  if (show) {
    openTag = openTag.replace(/class="([^"]*)"/, (_, cls) =>
      `class="${/\bshow\b/.test(cls) ? cls : `${cls} show`}"`);
  }
  if (!/\sdata-screen=/.test(openTag)) {
    openTag = openTag.replace(/(class="[^"]*")/, `$1 data-screen="${name}"`);
  }
  return openTag + rest;
}

const stale = [];
for (const page of PAGES) {
  const path = join(ROOT, page);
  const src = readFileSync(path, 'utf8');
  let count = 0;
  const out = src.replace(MARKER, (_full, indent, name, showFlag) => {
    count++;
    const el = decorate(extractScreen(name), name, Boolean(showFlag));
    return `${indent}<!--screen:${name}:start${showFlag || ''}-->\n${indent}${el}\n${indent}<!--screen:${name}:end-->`;
  });
  if (out !== src) {
    stale.push(`${page} (${count} screens)`);
    if (!CHECK) writeFileSync(path, out);
  } else if (count) {
    // up to date, nothing to do
  }
}

// --- Generate the per-screen-scoped CSS block in site.css ------------------
// Each component's <style> rules are scoped under the screen's root
// (.au[data-screen="NAME"], or .ped-doc for pedigree), replicating the old
// iframe isolation so identical class names across screens never collide, and
// keeping components the single source of truth for their own styles.

// Components whose <style> holds screen-specific rules (dashboard-light /
// evans-import carry none; their kit rules already live in site.css).
const STYLE_SCREENS = [
  'active-breedings', 'dashboard-dark', 'herd-list', 'kit-tracking', 'moon-breeding',
  'new-breeding', 'add-health-record', 'health-detail', 'kit-record', 'show-records',
  'pedigree-record',
];

const LEAKY_SEL = /^(body|html|\.preview)\b/;

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

// Split flat-or-@media CSS into top-level chunks (each a rule or an @media block).
function splitTop(css) {
  const chunks = [];
  let depth = 0, start = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { chunks.push(css.slice(start, i + 1)); start = i + 1; } }
  }
  return chunks.map(s => s.trim()).filter(Boolean);
}

function scopeSelector(sel, scope, rootToken) {
  const esc = rootToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Selector begins with the screen root token (`.au`, `.au.dark`, `.au .x`, `.ped-doc …`)?
  if (new RegExp(`^${esc}([\\s.>+~:]|$)`).test(sel)) return sel.replace(rootToken, scope);
  // Otherwise it's a descendant selector (`.au-hm`, `.card`, …) -> nest it under the scope.
  return `${scope} ${sel}`;
}

function scopeBlock(css, scope, rootToken) {
  const out = [];
  for (const chunk of splitTop(stripComments(css))) {
    if (chunk[0] === '@') {
      const braceAt = chunk.indexOf('{');
      const at = chunk.slice(0, braceAt).trim();
      const inner = chunk.slice(braceAt + 1, chunk.lastIndexOf('}'));
      const innerScoped = scopeBlock(inner, scope, rootToken);
      if (innerScoped.trim()) out.push(`    ${at}{\n${innerScoped}\n    }`);
    } else {
      const braceAt = chunk.indexOf('{');
      if (braceAt < 0) continue;
      const decls = chunk.slice(braceAt + 1, chunk.lastIndexOf('}')).trim();
      if (!decls) continue;
      const sels = chunk.slice(0, braceAt).split(',').map(s => s.trim())
        .filter(Boolean).filter(s => !LEAKY_SEL.test(s));
      if (!sels.length) continue;
      out.push(`    ${sels.map(s => scopeSelector(s, scope, rootToken)).join(', ')}{ ${decls} }`);
    }
  }
  return out.join('\n');
}

function screenStyle(name) {
  const html = readFileSync(join(ROOT, 'components', `${name}.html`), 'utf8');
  const m = html.match(/<style>([\s\S]*?)<\/style>/);
  if (!m) return '';
  const [scope, root] = name === 'pedigree-record'
    ? ['.ped-doc', '.ped-doc']
    : [`.au[data-screen="${name}"]`, '.au'];
  const body = scopeBlock(m[1], scope, root);
  return body ? `    /* ${name} */\n${body}` : '';
}

const CSS_START = '/* ==== screens:start (generated by scripts/inline-screens.mjs — do not edit by hand) ==== */';
const CSS_END = '/* ==== screens:end ==== */';

const generated = `${CSS_START}\n${STYLE_SCREENS.map(screenStyle).filter(Boolean).join('\n\n')}\n${CSS_END}`;

const cssPath = join(ROOT, 'assets', 'site.css');
const css = readFileSync(cssPath, 'utf8');
const eol = css.includes('\r\n') ? '\r\n' : '\n';
const block = generated.replace(/\n/g, eol);
let nextCss;
const s = css.indexOf(CSS_START);
if (s >= 0) {
  const e = css.indexOf(CSS_END, s) + CSS_END.length;
  nextCss = css.slice(0, s) + block + css.slice(e);
} else {
  nextCss = css.replace(/\s*$/, '') + eol + eol + block + eol;
}
if (nextCss !== css) {
  stale.push('assets/site.css (generated screens block)');
  if (!CHECK) writeFileSync(cssPath, nextCss);
}

if (CHECK) {
  if (stale.length) {
    console.error(`inline-screens: STALE -> run "npm run build:screens":\n  ${stale.join('\n  ')}`);
    process.exit(1);
  }
  console.log('inline-screens: up to date');
} else {
  console.log(stale.length ? `inline-screens: updated\n  ${stale.join('\n  ')}` : 'inline-screens: no changes');
}
