# HerdMaster — Dev & Production Deployment Plan

How the HerdMaster marketing site is developed, previewed, and shipped.

**Host:** Netlify · **Repo:** `cbwstudios/herdmaster-site` · **Netlify project:** `herdmaster-site`
**Production:** `https://herdmaster.app` (apex; `www` 301-redirects here)
**Dev preview:** `https://dev--herdmaster-site.netlify.app` (password-gated, not indexed)
**DNS:** GoDaddy

---

## 1. The flow at a glance

```
 work locally  ──►  push to dev  ──►  dev--herdmaster-site.netlify.app  ──►  approve  ──►  merge dev → main  ──►  herdmaster.app
 (localhost)        (git push)        (password-gated preview)              (review)      (git merge)            (production)
```

1. **Work locally**, preview on `localhost` (no build step; serve the folder).
2. **Push `dev`.** Netlify builds it to the password-gated preview URL.
3. **Review / share** the preview (behind the dev password).
4. **Promote:** merge `dev` → `main`. Netlify auto-deploys `main` to `herdmaster.app`.

GitHub Pages is retired; Netlify is the only deployer.

---

## 2. Environments

| Environment | Branch | URL | Public? | Indexed? | Analytics / CRM |
|---|---|---|---|---|---|
| **Production** | `main` | `https://herdmaster.app` (www → apex) | Yes | Yes | GA4 + GoHighLevel **on** |
| **Dev preview** | `dev` | `https://dev--herdmaster-site.netlify.app` | **No — password** | No | GA4/CRM off |
| **PR preview** | any PR | `https://deploy-preview-<n>--herdmaster-site.netlify.app` | No — password | No | GA4/CRM off |
| **Local** | working tree | `http://localhost:<port>` | — | No | GA4/CRM off |

The always-on production Netlify URL `herdmaster-site.netlify.app` mirrors production (public, tracking on, but client-side `noindex`).

---

## 3. Branch model

- **`main`** — production; always deployable. Never commit experiments straight to `main`.
- **`dev`** — integration branch; drives the password-gated preview for review.
- **`feature/*`** — optional; open a PR → gets its own password-gated Deploy Preview.

**Promotion:** `feature/*` → `dev` (review on the preview) → `main` (production). Small edits may go `dev` → `main` directly.

---

## 4. Why previews are safe (do not remove)

Every guard keys off the **hostname**, so production behaviour turns on only for `herdmaster.app` / `www.herdmaster.app`; all other hosts are treated as non-production automatically.

1. **Analytics/CRM are production-host-only.** In each page's `<head>`, an env gate loads **GA4 (`G-NJ4GDHK7XS`)** only on the production host, and the **GoHighLevel/LeadConnector** tag at the end of `<body>` is gated the same way. Non-production hosts (dev preview, PR previews, localhost) load neither.
2. **Previews are `noindex`.** The head gate injects `<meta name="robots" content="noindex, nofollow">` on any non-production host; `netlify.toml` also sends `X-Robots-Tag: noindex` on Deploy Previews and branch deploys.
3. **Dev is password-gated.** `netlify/edge-functions/dev-preview-auth.js` requires HTTP Basic-Auth on every non-production host. Production hosts pass straight through. The password comes from the **`DEV_PREVIEW_PASSWORD`** environment variable (set in Netlify; never committed); username defaults to `herdmaster` (override with `DEV_PREVIEW_USER`). It **fails closed** — if the env var is unset, the preview stays locked.

Production (`herdmaster.app`) is unaffected: analytics/CRM run and each page keeps its `index, follow` meta.

> If the production hostname ever changes, update: the allowed hosts in the `<head>` gate and `<body>` GHL gate on every page; `PROD_HOSTS` in the edge function; and canonicals/sitemap (§6).

---

## 5. Local development

Plain static files, no build step. Serve the folder (project config `herdmaster-static`) and open `localhost`. Analytics/CRM stay off and the page is `noindex` there — expected. Verify production tracking on the real domain after deploy, not locally.

---

## 6. Domain & DNS (GoDaddy)

- **Canonical / primary host:** apex `herdmaster.app`. All `<link rel=canonical>`, `og:url`, Twitter, JSON-LD, `og:image`, and `sitemap.xml` point at `https://herdmaster.app`.
- **`www.herdmaster.app` 301-redirects to the apex** (configured in Netlify → Domain management).

**GoDaddy DNS records** (GoDaddy → My Products → herdmaster.app → DNS — *edit the existing `@` and `www` records; leave MX/TXT/other records untouched*):

| Type | Name | Value | Purpose |
|---|---|---|---|
| `A` | `@` | `75.2.60.5` | apex → Netlify load balancer (GoDaddy can't ALIAS the apex) |
| `CNAME` | `www` | `herdmaster-site.netlify.app` | www → Netlify (redirects to apex) |

After the records propagate, in Netlify → Domain management click **Verify DNS configuration** so HTTPS (Let's Encrypt) provisions.

The dev preview needs no DNS — it lives on the free `dev--herdmaster-site.netlify.app` Netlify subdomain.

---

## 7. One-time Netlify setup (state at handoff)

- [x] Site `herdmaster-site` created from `cbwstudios/herdmaster-site`; production branch `main`; publish `.` (pinned by `netlify.toml`); no build command.
- [x] Custom domains added: `herdmaster.app` (primary) + `www.herdmaster.app` (redirect) — **pending DNS**.
- [x] Branch deploys enabled for `dev`.
- [x] Basic-Auth edge function committed (gates all non-production hosts).
- [ ] **You:** add the GoDaddy DNS records above, then Netlify → Verify DNS configuration.
- [ ] **You:** set the dev password — Netlify → Project configuration → Environment variables → add `DEV_PREVIEW_PASSWORD` = a password of your choice (optionally `DEV_PREVIEW_USER`). Redeploy `dev` to apply.

---

## 8. Rollback

- **Instant:** Netlify → Deploys → last good production deploy → **Publish deploy** (reverts live, no git change).
- **Durable:** revert the commit on `main` and push; Netlify redeploys.

---

## Repo files that implement this

- `netlify.toml` — publish dir + `X-Robots-Tag: noindex` on preview/branch deploys.
- `netlify/edge-functions/dev-preview-auth.js` — Basic-Auth on non-production hosts.
- `<head>` env gate on every page — GA4 on prod only, non-prod `noindex`.
- End-of-`<body>` gate on every page — host-gated GoHighLevel/LeadConnector.
- `robots.txt`, `sitemap.xml` — canonical host = `herdmaster.app`.
- GitHub Pages workflow — **removed**; Netlify is the sole deployer.
