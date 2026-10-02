# Rached Chakchouk — Portfolio

**Full Stack Software Engineer · Java / Spring Boot / Angular**

🔗 **Live:** https://rached-chakchouk.netlify.app

![Portfolio preview](preview.webp)

## About

Personal portfolio presenting my experience building ERP and business applications
(invoicing, Tunisian taxation, HR & payroll) with **Java, Spring Boot, Angular and PostgreSQL**.

## Features

- Bilingual **French / English** switch
- **Light / dark** theme (follows the system preference, choice saved locally)
- Experience timeline, interactive **projects** section with filters and detail modal
- **Online resume viewer** (FR / EN) and PDF download
- Contact form with front-end validation (ready to connect to Formspree or a REST API)
- Responsive from 375 px to large screens, keyboard accessible, respects `prefers-reduced-motion`

## Tech

Plain **HTML, CSS and vanilla JavaScript** — no framework, no build step, fast to load.
Fonts: Geist (Google Fonts). Technology icons: [Devicon](https://devicon.dev) and [Simple Icons](https://simpleicons.org).

## Structure

```
index.html            # the whole site (markup, styles, scripts)
Rached_Chakchouk_CV_FR.pdf / _EN.pdf
cv/                   # resume pages for the online viewer
bg/                   # background images
favicon-32.png, apple-touch-icon.png
netlify.toml          # Netlify config (static site + functions)
netlify/              # serverless functions (track, stats) and shared lib
dashboard/            # private analytics dashboard
projects/             # project screenshots
content.json          # default site content (editable from the dashboard)
logos/, photo.jpg     # default logo and profile photo
_headers              # security headers (CSP, HSTS, X-Frame-Options...)
```

## Portfolio Analytics (visits dashboard)

A small privacy-friendly analytics system built for this site:

- **Tracker** in `index.html`: cookie-free `sendBeacon` on page view and key actions (resume download/view, LinkedIn, GitHub, project opened, contact). Disabled with *Do Not Track* and on the owner's own devices.
- **API** (Netlify Functions): `netlify/functions/track.mjs` → `POST /api/track`, `netlify/functions/stats.mjs` → `GET /api/stats?days=30`.
- **Storage**: Netlify Blobs. Country/city come from Netlify's edge geolocation; **IP addresses are never stored** (a daily-salted hash only counts unique visitors).
- **Dashboard**: `/dashboard/` — password-protected (env var `DASHBOARD_PASSWORD`, constant-time comparison), hand-made SVG charts, 7/30/90-day ranges, light/dark theme. A clearly labelled demo mode shows fictitious data.
- Shared logic in `netlify/lib/analytics.mjs` (unit-testable).

Environment variables (Netlify → Project configuration → Environment variables):

| Name | Purpose |
|---|---|
| `DASHBOARD_PASSWORD` | password for `/dashboard/` (required) |
| `ANALYTICS_SALT` | random string used to hash visitors (recommended) |

## Content management (dashboard)

Logged into `/dashboard/`, the owner can edit the site without touching the code:

- **Contenu du site**: profile, experiences, internships, projects, skills, education and languages (FR / EN). Add, edit, reorder, delete, then *Publier*. Stored in Netlify Blobs (`/api/admin/content`) and served publicly by `/api/content`; the page falls back to the defaults in `content.json` (also embedded in `index.html`).
- **CV, photo et images**: replace or reset the French / English resume (PDF, 4 MB max) and the profile photo; upload images for projects or logos (JPG / PNG / WebP, 3 MB max). Files are served by `/media/:name`; the real file type is checked server-side.
- All admin endpoints require `DASHBOARD_PASSWORD`; content is sanitized (unsafe URLs removed) and always rendered escaped.

## Deployment

Hosted on **Netlify**. Every push to `main` redeploys the site automatically.

## Security

Security headers (CSP, HSTS, clickjacking protection, strict referrer and permissions policies) are defined in `_headers`. See [SECURITY.md](SECURITY.md) to report a vulnerability.

## License

© 2026 Rached Chakchouk — **All rights reserved.** The code is shared for viewing only; photos, resumes and personal content may not be reused without permission. See [LICENSE](LICENSE).

## Contact

- LinkedIn: [linkedin.com/in/rached-chakchouk](https://linkedin.com/in/rached-chakchouk)
- GitHub: [github.com/rachedchakchouk](https://github.com/rachedchakchouk)
