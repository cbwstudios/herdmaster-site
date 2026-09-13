/*
 * archive-app-privacy.cjs — App Privacy Policy immutable-archive generator.
 *
 * Produces a permanent, INDEPENDENT static snapshot of the App Privacy policy
 * ONLY (the "HerdMaster app privacy" tab of /privacy) at the route:
 *
 *     /privacy/archive/<app-policy-identifier>/
 *
 * Unlike archive-privacy.cjs (which freezes the whole combined page, both
 * tabs), this script extracts just the app-facing panel and renders it as a
 * standalone single-column page: no tablist, no Website Privacy content. The
 * snapshot is a self-contained HTML file with the full App Privacy text
 * inline — it does NOT import from, iframe, fetch, or otherwise depend on the
 * canonical /privacy at runtime. Editing /privacy later does not change an
 * already-generated archive. Head conventions mirror the existing archives:
 * "Archived <id>" title, noindex, self-canonical.
 *
 * Usage:
 *     node scripts/archive-app-privacy.cjs <app-policy-identifier> [outputRoot]
 *
 *   <app-policy-identifier>  e.g. HM-APP-PRIVACY-2026-09-14-v1.3 (must already
 *                            be the identifier displayed on the app tab).
 *   [outputRoot]             optional; defaults to the repo root. Pass a temp
 *                            dir for a dry run so nothing is written into the
 *                            repo.
 *
 * Safety: this script only READS privacy/index.html and WRITES one new archive
 * file. It never modifies the canonical page, and it REFUSES to overwrite an
 * archive directory that already exists (archives are immutable).
 */
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const id = process.argv[2];
const outRoot = process.argv[3] ? path.resolve(process.argv[3]) : REPO;

function die(msg) { console.error("ERROR: " + msg); process.exit(1); }

if (!id) die("app-policy-identifier required. Usage: node scripts/archive-app-privacy.cjs <app-policy-identifier> [outputRoot]");
if (!/^[A-Za-z0-9._-]+$/.test(id)) die("identifier must be URL-safe ([A-Za-z0-9._-]).");

const dir = path.join(outRoot, "privacy", "archive", id);
const outFile = path.join(dir, "index.html");
if (fs.existsSync(dir)) die("archive already exists and is immutable, refusing to overwrite: " + dir);

const src = fs.readFileSync(path.join(REPO, "privacy", "index.html"), "utf8");
const crlf = src.includes("\r\n");
let a = crlf ? src.replace(/\r\n/g, "\n") : src;

// --- Extract the app panel only -------------------------------------------------
const TABS_OPEN  = '<div class="legal-tabs"';
const APP_OPEN   = '<div class="legal-panel" id="panel-privacy-app"';
const ART_CLOSE  = "</article>";

const iTabs = a.indexOf(TABS_OPEN);
const iApp  = a.indexOf(APP_OPEN);
const iArt  = a.indexOf(ART_CLOSE);
if (iTabs < 0 || iApp < 0 || iArt < 0 || !(iTabs < iApp && iApp < iArt)) die("could not locate tablist / app panel / </article> markers in privacy/index.html");
if (a.indexOf(APP_OPEN, iApp + 1) !== -1) die("more than one app panel found");

// Everything before the tablist (head, site header, <h1>), then the app panel through
// its closing </div>, then </article> and the rest of the page (footer, scripts).
const before = a.slice(0, iTabs);
let panel = a.slice(iApp, iArt);
const after = a.slice(iArt);

// Standalone panel: not a tabpanel any more (no tablist to label it), and visible.
const panelOpenEnd = panel.indexOf(">");
panel = '<div class="legal-panel" id="panel-privacy-app">' + panel.slice(panelOpenEnd + 1);

a = before + panel + after;

// --- Archive head conventions (same as archive-privacy.cjs) ---------------------
// Depth: /privacy/ (1) -> /privacy/archive/<id>/ (3). Rewrite every root-relative
// "../" link (assets, nav, footer) to "../../../".
a = a.replace(/="\.\.\//g, '="../../../');
a = a.replace(/<title>[^<]*<\/title>/, `<title>HerdMaster App Privacy Policy — Archived ${id}</title>`);
a = a.replace(/<meta name="robots" content="index, follow">/, '<meta name="robots" content="noindex, follow">');
a = a.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="https://herdmaster.app/privacy/archive/${id}">`);

// --- Sanity checks before writing -----------------------------------------------
if (a.indexOf(id) === -1) die("the app-policy identifier " + id + " does not appear in the extracted App Privacy panel; set it on the canonical page first.");
if (a.indexOf('id="panel-privacy-website"') !== -1 || a.indexOf('class="legal-tabs"') !== -1) die("website panel or tablist leaked into the app archive.");
if (a.indexOf('<h2 id="app-') === -1) die("no App Privacy sections found in the archive body.");

if (crlf) a = a.replace(/\n/g, "\r\n");

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(outFile, a);

console.log("wrote independent App Privacy archive snapshot:");
console.log("  " + outFile);
console.log("  route: /privacy/archive/" + id + "/");
console.log("  (app policy only, noindex, self-canonical, all text inline — no runtime dependency on /privacy)");
