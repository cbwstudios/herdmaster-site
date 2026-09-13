/*
 * privacy-app-text-hash.cjs — "complete operative text" hash for the App
 * Privacy policy.
 *
 * Produces a deterministic, markup-free UTF-8 text representation of the
 * complete App Privacy policy in document order and prints its SHA-256, so
 * the operative text can be verified independently of HTML/CSS/nav changes
 * and reproduced after a production deployment.
 *
 * Usage:
 *     node scripts/privacy-app-text-hash.cjs [html-file] [--out file.txt]
 *
 *   html-file   privacy/index.html (default) or any App Privacy archive
 *               index.html. Works on a downloaded copy of a deployed page too.
 *   --out       also write the normalized text to a file (for inspection).
 *
 * Normalization method (all steps are required to reproduce the hash):
 *   1. Read the HTML as UTF-8.
 *   2. Take only the App Privacy panel: the element
 *        <div class="legal-panel" id="panel-privacy-app" ...> ... </div>
 *      (matched by tag depth), ignoring everything else on the page: site
 *      header/nav, footer, scripts, styles, tab controls, Website Privacy.
 *   3. Remove the table of contents (<nav class="toc"> ... </nav>): it is
 *      navigation, not policy text.
 *   4. Treat each <h2>, <h3>, <p>, and <li> element as one line, in document
 *      order. Within each line: strip all tags, decode HTML entities
 *      (&amp; &lt; &gt; &quot; &#39; &nbsp; &mdash; &rsquo; &lsquo; &rdquo;
 *      &ldquo; &hellip; and numeric &#NNN;/&#xHH;), convert NBSP to a space,
 *      collapse all whitespace runs to a single space, and trim.
 *   5. Drop empty lines.
 *   6. Join lines with "\n" (LF) and append exactly one trailing "\n".
 *   7. Encode as UTF-8 with no BOM. SHA-256 those bytes.
 *
 * Output: the hex SHA-256, the byte count, and the line count.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const args = process.argv.slice(2);
let outFile = null;
const oi = args.indexOf("--out");
if (oi !== -1) { outFile = args[oi + 1]; args.splice(oi, 2); }
const file = args[0] || path.join(__dirname, "..", "privacy", "index.html");

const html = fs.readFileSync(file, "utf8");

// 2. Isolate the App Privacy panel by matching <div ...> / </div> depth.
const OPEN = /<div class="legal-panel" id="panel-privacy-app"[^>]*>/;
const m = OPEN.exec(html);
if (!m) { console.error("ERROR: App Privacy panel not found in " + file); process.exit(1); }
let i = m.index + m[0].length, depth = 1;
const tagRe = /<\/?div\b[^>]*>/g;
tagRe.lastIndex = i;
let t, end = -1;
while ((t = tagRe.exec(html))) {
  depth += t[0][1] === "/" ? -1 : 1;
  if (depth === 0) { end = t.index; break; }
}
if (end < 0) { console.error("ERROR: unbalanced App Privacy panel"); process.exit(1); }
let panel = html.slice(i, end);

// 3. Drop the table of contents (navigation).
panel = panel.replace(/<nav class="toc"[\s\S]*?<\/nav>/g, "");

// 4. One line per block element.
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…", copy: "©" };
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return Object.prototype.hasOwnProperty.call(ENT, e) ? ENT[e] : all;
  });
}
const lines = [];
const blockRe = /<(h2|h3|p|li)\b[^>]*>([\s\S]*?)<\/\1>/g;
let b;
while ((b = blockRe.exec(panel))) {
  const text = decode(b[2].replace(/<[^>]+>/g, "")).replace(/ /g, " ").replace(/\s+/g, " ").trim();
  if (text) lines.push(text);            // 5. drop empty lines
}

// 6–7. LF-joined, one trailing newline, UTF-8 without BOM.
const text = lines.join("\n") + "\n";
const bytes = Buffer.from(text, "utf8");
const sha = crypto.createHash("sha256").update(bytes).digest("hex");
if (outFile) fs.writeFileSync(outFile, bytes);

console.log("source:  " + file);
console.log("lines:   " + lines.length);
console.log("bytes:   " + bytes.length);
console.log("sha256:  " + sha);
