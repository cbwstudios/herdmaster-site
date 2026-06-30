# HerdMaster marketing site

Static, hand-coded marketing site for HerdMaster (a native iOS rabbit and cavy herd, breeding, and
show app by Joseph Kim). Pure HTML, CSS, and vanilla JS, no build step, no server required.

## Open it

Double-click `index.html` (or open it in any browser). All links and assets are relative, so you can
browse the whole site straight from the files, and you can move or zip this `code/` folder anywhere.

```
code/
  index.html              Home
  features/index.html
  pricing/index.html
  getting-started/index.html
  faq/index.html
  contact/index.html
  privacy/index.html
  terms/index.html
  assets/
    site.css              all shared styles
    site.js               all shared JS (menu, FAQ accordion, forms, scroll reveal, hero parallax)
    logo.png, favicon.svg, *.webp
```

Every page links the same `assets/site.css` and `assets/site.js`. The Google Fonts stylesheet loads
over the internet, so headings use a system fallback if you are fully offline.

## Fill in before you publish

Placeholders are left visible in the markup so they are easy to find:
`[GA4 ID]`, `[GHL FORM ENDPOINT]`, `[NOTIFY EMAIL]`, `[SUPPORT EMAIL]`, `[BUSINESS PHONE]`,
`[LEGAL ENTITY]`, `[ENTITY ADDRESS]`, `[GOVERNING STATE]`, `[EFFECTIVE DATE]`.

The launch-list and contact forms are mock submits (they show a success message but post nowhere);
wire them up when you choose a backend. Each page also carries a
`<meta name="robots" content="noindex, follow">` line; remove it when you want search engines to index.

## Still to add (optional)

- A 1200x630 `assets/og-image.png` for social sharing (referenced in each page head).
- Raster favicons / app icons if you want them (a vector `favicon.svg` is already included).
- Real screenshots: held app screens currently show a gray placeholder box with a caption.
