/*
 * archive-privacy.cjs — Privacy Policy immutable-archive generator.
 *
 * Produces a permanent, INDEPENDENT static snapshot of the current
 * /privacy page at the route:
 *
 *     /privacy/archive/<version-identifier>/
 *
 * The snapshot is a self-contained HTML file (its own copy of the full
 * Privacy text, both tabs) — it does NOT import from, iframe, fetch, or
 * otherwise depend on the canonical /privacy at runtime. Editing
 * /privacy later does not change an already-generated archive. This
 * mirrors the Terms archive at /terms/archive/HM-TERMS-2026-08-24-v1.0/.
 *
 * Usage:
 *     node scripts/archive-privacy.cjs <version-identifier> [outputRoot]
 *
 *   <version-identifier>  e.g. PP-2026-08-24-v1.0  (NOT yet assigned —
 *                         supply the production identifier when Joseph
 *                         finalizes the Privacy version).
 *   [outputRoot]          optional; defaults to the repo root. Pass a temp
 *                         dir for a dry run so nothing is written into the
 *                         repo.
 *
 * This script only READS privacy/index.html and WRITES the new archive
 * file. It never modifies the canonical /privacy page.
 */
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const id = process.argv[2];
const outRoot = process.argv[3] ? path.resolve(process.argv[3]) : REPO;

if (!id) { console.error("ERROR: version-identifier required. Usage: node scripts/archive-privacy.cjs <version-identifier> [outputRoot]"); process.exit(1); }
if (!/^[A-Za-z0-9._-]+$/.test(id)) { console.error("ERROR: identifier must be URL-safe ([A-Za-z0-9._-])."); process.exit(1); }

let src = fs.readFileSync(path.join(REPO, "privacy", "index.html"), "utf8");
const crlf = src.includes("\r\n");
let a = crlf ? src.replace(/\r\n/g, "\n") : src;

// Depth: /privacy/ (1) -> /privacy/archive/<id>/ (3). Rewrite every root-relative
// "../" link (assets, nav, footer) to "../../../".
a = a.replace(/="\.\.\//g, '="../../../');
// Independent, permanent snapshot: noindex + self-canonical to the archive URL.
a = a.replace(/<title>[^<]*<\/title>/, `<title>HerdMaster Privacy Policy — Archived ${id}</title>`);
a = a.replace(/<meta name="robots" content="index, follow">/, '<meta name="robots" content="noindex, follow">');
a = a.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="https://herdmaster.app/privacy/archive/${id}">`);

if (crlf) a = a.replace(/\n/g, "\r\n");

const dir = path.join(outRoot, "privacy", "archive", id);
fs.mkdirSync(dir, { recursive: true });
const outFile = path.join(dir, "index.html");
fs.writeFileSync(outFile, a);

console.log("wrote independent Privacy archive snapshot:");
console.log("  " + outFile);
console.log("  route: /privacy/archive/" + id + "/");
console.log("  (noindex, self-canonical, all Privacy content inline — no runtime dependency on /privacy)");
