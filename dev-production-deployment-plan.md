# HerdMaster — Dev & Production Deployment Plan

How the HerdMaster marketing site is developed, previewed, and shipped.

**Host:** Netlify (production **and** previews).
**Repo:** `cbwstudios/herdmaster-site` (personal account).
**Production URL:** `https://www.herdmaster.app`

---

## 1. The flow at a glance

```
 work locally  ──►  push a branch / open PR  ──►  Netlify preview URL  ──►  approve  ──►  merge to main  ──►  production
 (localhost)        (git push)                    (auto, per branch/PR)    (review)      (git merge)          www.herdmaster.app
```

1. **Work locally.** Edit files; preview with the local dev server (see §5).
2. **Push to a branch** (`dev` or a `feature/*` branch). Netlify automatically builds it and posts a **preview URL** — nothing to configure per push.
3. **Review the preview.** Share the URL for sign-off. Previews are `noindex` and run **no analytics/CRM** (see §4).
4. **Promote:** merge the branch into **`main`** (directly or via PR). Netlify deploys `main` to **www.herdmaster.app**.

There is no GitHub Pages deploy anymore — Netlify is the only deployer.

---

## 2. Environments

| Environment | Branch | URL | Indexed? | Analytics / CRM |
|---|---|---|---|---|
| **Production** | `main` | `https://www.herdmaster.app` | Yes | **On** (GA4, GoHighLevel, Feedbucket) |
| **Staging preview** | `dev` | `https://dev--<site>.netlify.app` (stable) | No | Off |
| **PR preview** | any PR | `https://deploy-preview-<n>--<site>.netlify.app` | No | Off |
| **Local** | working tree | `http://localhost:<port>` | No | Off |

`<site>` is the Netlify site name chosen when the site is created (e.g. `herdmaster-site`).

---

## 3. Branch model

- **`main`** — always deployable; this is production. Never commit experimental work straight to `main`.
- **`dev`** — long-lived integration branch; gives a stable preview URL to share with the client for review.
- **`feature/*`** — optional short-lived branches for individual pieces of work; each opens a PR with its own preview.

**Promotion:** `feature/*` → `dev` (review on the `dev` preview) → `main` (production). For small, low-risk edits, `dev` → `main` directly is fine.

---

## 4. Why previews are safe (do not remove)

A staging URL that is public, indexable, and wired to live analytics/CRM is a hazard: it double-counts Google Analytics, injects fake leads into the CRM, and can get the staging copy indexed by Google. Two guards prevent all of that, and **both are keyed to the hostname**, so they work on every host automatically:

1. **Tracking is production-host-only.** In every page's `<head>`, an environment gate loads **GA4 (`G-NJ4GDHK7XS`)** and **Feedbucket** only when `location.hostname` is `www.herdmaster.app` or `herdmaster.app`. The **GoHighLevel / LeadConnector** tracker at the end of `<body>` is gated the same way. On any other host (Netlify preview, `dev`, localhost) none of them load — so previews never touch analytics or the CRM.
2. **Previews are `noindex`.**
   - Client side: the same head gate injects `<meta name="robots" content="noindex, nofollow">` on any non-production host.
   - Server side: `netlify.toml` sends `X-Robots-Tag: noindex` on **Deploy Previews** and **branch deploys**.

Production (`www.herdmaster.app`) is unaffected: analytics/CRM run, and each page keeps its own `index, follow` meta.

> If the production hostname ever changes, update the two allowed hostnames in the `<head>` gate on every page (and the GHL gate at the bottom), plus canonicals/sitemap (see §6).

---

## 5. Local development

The site is plain static files — no build step.

- Serve the folder with any static server (the project's local preview config is `herdmaster-static`). Open the `localhost` URL.
- Because localhost isn't the production host, analytics/CRM stay off and the page is `noindex` — expected. To sanity-check production tracking, test on the real domain after deploy, not locally.

---

## 6. Domain & DNS

- **Primary / canonical host:** `www.herdmaster.app`. All `<link rel=canonical>`, `og:url`, Twitter, JSON-LD, `og:image`, and `sitemap.xml` entries point at `https://www.herdmaster.app`.
- **Apex** `herdmaster.app` **301-redirects to** `www` (set in Netlify → Domain management).
- **DNS** for `herdmaster.app` is managed at the domain's registrar/DNS provider. Netlify's Domain settings page shows the exact records to add (a `CNAME`/alias for `www` → the Netlify site, and the apex record per Netlify's instructions). Enable Netlify's automatic HTTPS once DNS resolves.

To switch the canonical to the bare apex instead, reverse the redirect in Netlify and change `https://www.herdmaster.app` → `https://herdmaster.app` across the pages, `sitemap.xml`, and `robots.txt`.

---

## 7. One-time Netlify setup checklist

Done once, in the Netlify UI (the GitHub App is already installed on the account):

- [ ] **Create site:** Add new site → Import an existing project → GitHub → `cbwstudios/herdmaster-site`. (If the GitHub App is scoped to "only select repositories," grant it access to this repo first.)
- [ ] **Build settings:** Build command = *(none)*; Publish directory = `.` (repo root). `netlify.toml` already pins `publish = "."`.
- [ ] **Production branch** = `main`.
- [ ] **Domain:** add `www.herdmaster.app` (set as primary) and `herdmaster.app` (redirect to www); create the DNS records Netlify lists; enable HTTPS.
- [ ] **(Optional) Protect previews:** enable site protection / password on non-production contexts if the staging site should not be public.
- [ ] **Confirm:** push `dev`, open the preview URL, and check that `curl -I <preview>` returns `X-Robots-Tag: noindex` and that no `googletagmanager` / `codedesign.co` / `feedbucket` requests fire on the preview.

---

## 8. Rollback

- **Instant:** Netlify → Deploys → pick the last good production deploy → **Publish deploy**. This reverts the live site without a git change.
- **Durable:** revert the offending commit on `main` and push; Netlify redeploys.

---

## Repo files that implement this

- `netlify.toml` — publish dir + `X-Robots-Tag: noindex` on preview/branch deploys.
- `<head>` env gate on every page (`index.html`, `404.html`, and each `*/index.html`) — host-gated GA4 + Feedbucket + non-prod noindex.
- End-of-`<body>` gate on every page — host-gated GoHighLevel/LeadConnector.
- `robots.txt`, `sitemap.xml` — canonical host = `www.herdmaster.app`.
- GitHub Pages workflow (`.github/workflows/pages.yml`) has been **removed** — Netlify is the sole deployer.
