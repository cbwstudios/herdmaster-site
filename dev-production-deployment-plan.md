# HerdMaster — Dev & Production Deployment Plan

How the HerdMaster marketing site is developed, previewed, and shipped.

**Host:** Netlify (production **and** dev preview).
**Repo:** `cbwstudios/herdmaster-site` (personal account).
**Production URL:** `https://herdmaster.app` (apex; `www` redirects here).
**Dev preview URL:** `https://dev.herdmaster.app` (password-gated, not indexed).
**DNS:** GoDaddy.

---

## 1. The flow at a glance

```
 work locally  ──►  push to dev  ──►  dev.herdmaster.app  ──►  approve  ──►  merge dev → main  ──►  herdmaster.app
 (localhost)        (git push)        (private preview)        (review)      (git merge)            (production)
```

1. **Work locally**, preview on `localhost` (see §5).
2. **Push the `dev` branch.** Netlify builds it and updates **`https://dev.herdmaster.app`** — private (password) and `noindex`.
3. **Review / share** the dev URL for sign-off.
4. **Promote:** merge `dev` → **`main`**. Netlify deploys `main` to **`https://herdmaster.app`**.

GitHub Pages is retired; Netlify is the only deployer.

---

## 2. Environments

| Environment | Branch | URL | Public? | Indexed? | Analytics / CRM |
|---|---|---|---|---|---|
| **Production** | `main` | `https://herdmaster.app` (www → apex) | Yes | Yes | **On** (GA4, GoHighLevel, Feedbucket) |
| **Dev preview** | `dev` | `https://dev.herdmaster.app` | **No — password** | No | Off |
| **PR preview** | any PR | `https://deploy-preview-<n>--<site>.netlify.app` | No | No | Off |
| **Local** | working tree | `http://localhost:<port>` | — | No | Off |

---

## 3. Branch model

- **`main`** — production; always deployable. Never commit experiments straight to `main`.
- **`dev`** — integration branch; drives `dev.herdmaster.app` for client/stakeholder review.
- **`feature/*`** — optional; each opens a PR with its own throwaway preview URL.

**Promotion:** `feature/*` → `dev` (review on `dev.herdmaster.app`) → `main` (production). Small, low-risk edits may go `dev` → `main` directly.

---

## 4. Why previews are safe (do not remove)

Every guard is keyed to the **hostname**, so production behaviour turns on only for `herdmaster.app` / `www.herdmaster.app`; every other host (dev, PR previews, localhost) is treated as non-production automatically.

1. **Tracking is production-host-only.** In each page's `<head>`, an env gate loads **GA4 (`G-NJ4GDHK7XS`)** + **Feedbucket** only on the production host; the **GoHighLevel / LeadConnector** tag at the end of `<body>` is gated the same way. On `dev.herdmaster.app` (or anywhere else) none of them load — previews never touch analytics or the CRM.
2. **Previews are `noindex`.** The head gate injects `<meta name="robots" content="noindex, nofollow">` on any non-production host, and `netlify.toml` sends `X-Robots-Tag: noindex` on Deploy Previews and branch deploys.
3. **Dev is password-gated.** `dev.herdmaster.app` requires a password (Netlify site protection on Pro; otherwise a Netlify Edge Function enforcing Basic Auth on the branch — see §7). Combined with #2, the dev site is both private and unindexed.

Production (`herdmaster.app`) is unaffected: analytics/CRM run and each page keeps its `index, follow` meta.

> If the production hostname ever changes, update the allowed hostnames in the `<head>` gate and the `<body>` GHL gate on every page, plus canonicals/sitemap (§6).

---

## 5. Local development

Plain static files, no build step. Serve the folder with any static server (project config: `herdmaster-static`) and open `localhost`. Because localhost isn't the production host, analytics/CRM stay off and the page is `noindex` — expected. Verify production tracking on the real domain after deploy, not locally.

---

## 6. Domain & DNS (GoDaddy)

- **Canonical / primary host:** apex `herdmaster.app`. All `<link rel=canonical>`, `og:url`, Twitter, JSON-LD, `og:image`, and `sitemap.xml` point at `https://herdmaster.app`.
- **`www.herdmaster.app` 301-redirects to the apex** (set in Netlify → Domain management).
- **`dev.herdmaster.app`** is a **branch subdomain** mapped to the `dev` branch (Netlify → Domain management → branch subdomains).

**GoDaddy DNS records** (add under *My Products → DNS* for herdmaster.app; the exact CNAME target is the Netlify site name, filled in once the site exists):

| Type | Name | Value | Purpose |
|---|---|---|---|
| `A` | `@` | `75.2.60.5` | apex → Netlify (GoDaddy can't CNAME the apex) |
| `CNAME` | `www` | `<site-name>.netlify.app` | www → Netlify (redirects to apex) |
| `CNAME` | `dev` | `<site-name>.netlify.app` | dev subdomain → Netlify branch deploy |

Enable Netlify's automatic HTTPS once records resolve. (If we later move DNS to Netlify nameservers, these become automatic — but that's an optional bigger change.)

To flip the canonical to `www` instead of apex, reverse the redirect in Netlify and change `https://herdmaster.app` → `https://www.herdmaster.app` across the pages, `sitemap.xml`, and `robots.txt`.

---

## 7. One-time Netlify setup (done via the Netlify CLI + a few UI/DNS steps)

CLI-driven where possible; the GitHub App is already installed on the account.

- [ ] **Authenticate:** `netlify login` (browser OAuth; the token is stored locally, never shared).
- [ ] **Create + link the site** to `cbwstudios/herdmaster-site`, production branch `main`, publish dir `.` (pinned by `netlify.toml`).
- [ ] **Confirm continuous deploy** from GitHub (push `main` → production; push `dev` → dev deploy).
- [ ] **Domains:** add `herdmaster.app` (primary), `www` (redirect to apex), and the `dev` branch subdomain; add the GoDaddy DNS records above; enable HTTPS.
- [ ] **Gate dev:** enable password protection scoped to non-production (Netlify Pro), or deploy the Basic Auth Edge Function fallback for `dev.herdmaster.app`.
- [ ] **Verify:** `dev.herdmaster.app` prompts for a password, serves `X-Robots-Tag: noindex`, and loads no `googletagmanager` / `codedesign.co` / `feedbucket` requests; `herdmaster.app` serves 200 with tracking on and `www` 301s to it.

---

## 8. Rollback

- **Instant:** Netlify → Deploys → last good production deploy → **Publish deploy** (reverts live with no git change).
- **Durable:** revert the commit on `main` and push; Netlify redeploys.

---

## Repo files that implement this

- `netlify.toml` — publish dir + `X-Robots-Tag: noindex` on preview/branch deploys (+ Basic Auth edge function config if used).
- `<head>` env gate on every page — host-gated GA4 + Feedbucket + non-prod `noindex`.
- End-of-`<body>` gate on every page — host-gated GoHighLevel/LeadConnector.
- `robots.txt`, `sitemap.xml` — canonical host = `herdmaster.app`.
- GitHub Pages workflow (`.github/workflows/pages.yml`) — **removed**; Netlify is the sole deployer.
