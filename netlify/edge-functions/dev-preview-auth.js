// Basic-Auth gate for non-production deploys (the `dev` branch preview at
// dev--herdmaster-site.netlify.app, and any PR Deploy Preview).
//
// Production hosts pass straight through — never gated. Every other host must
// send valid Basic-Auth credentials. The password is read from the
// DEV_PREVIEW_PASSWORD environment variable (set in the Netlify UI, never
// committed); the username defaults to "herdmaster" unless DEV_PREVIEW_USER is set.
//
// Fail-closed: if DEV_PREVIEW_PASSWORD is unset, non-production hosts stay locked.

const PROD_HOSTS = new Set([
  "herdmaster.app",
  "www.herdmaster.app",
  "herdmaster-site.netlify.app",
]);

export default async (request) => {
  const host = new URL(request.url).hostname;

  // Production: no gate.
  if (PROD_HOSTS.has(host)) return;

  const password = Netlify.env.get("DEV_PREVIEW_PASSWORD");
  const user = Netlify.env.get("DEV_PREVIEW_USER") || "herdmaster";

  const header = request.headers.get("authorization") || "";
  if (password && header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {
      decoded = "";
    }
    const sep = decoded.indexOf(":");
    if (sep !== -1) {
      const u = decoded.slice(0, sep);
      const p = decoded.slice(sep + 1);
      if (u === user && p === password) return; // authorized → continue to the site
    }
  }

  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="HerdMaster dev preview", charset="UTF-8"',
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
};

export const config = { path: "/*" };
