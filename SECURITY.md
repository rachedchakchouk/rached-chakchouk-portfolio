# Security Policy

## Scope

This repository hosts a static personal portfolio (HTML, CSS, vanilla JavaScript)
published at https://rached-chakchouk.vercel.app (main address, Vercel) and
https://rached-chakchouk.netlify.app (backup address, Netlify).
It uses a few Netlify Functions (anonymous visit analytics and a password-protected
admin API for editing content and files). It stores no personal data from visitors
(no cookies, IP addresses are never stored).

## Security measures

- HTTPS enforced, with HSTS
- Strict Content Security Policy: scripts only from the site itself (no inline scripts), restricted styles, fonts and connections
- Clickjacking protection (`frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`)
- Admin login: the password (environment variable) is sent once to `/api/admin/login`, which returns a
  signed session token valid for 2 hours (HMAC-SHA256); the password is never stored in the browser.
  Login and "forgotten password" require a valid Google reCAPTCHA v3 token (when configured), so scripted
  attempts are refused before they count. 5 failed attempts lock logins for 15 minutes, and 60 failed attempts
  in an hour (all visitors together) lock them, against brute force spread over many addresses.
  Rate-limit counters are append-only (one record per attempt, strong consistency): parallel requests cannot
  overwrite each other to get extra attempts.
  The dashboard and admin API are served only by the Netlify back-end (the Vercel address redirects there).
  Session tokens can be signed with a dedicated random secret (`SESSION_SECRET`), separate from the password.
- Password change from the dashboard (current password required, 10+ characters, 3 character types);
  the new password is stored only as a salted scrypt hash, and every change signs out all other sessions.
- Forgotten password: a one-time temporary password (valid 15 minutes) is e-mailed to the fixed admin
  address (never taken from the request); it only allows choosing a new password. Limited to 3 requests
  per visitor per hour and 6 per day.
- Rate limiting on the analytics endpoint (per visitor and per day), same-origin check, bot filtering;
  visit records are deleted after 13 months.
- Admin API: uploads limited in size and checked by real file signature;
  edited content sanitized and always rendered escaped
- `X-Content-Type-Options: nosniff`, strict `Referrer-Policy`, restrictive `Permissions-Policy`
- External links opened with `rel="noopener noreferrer"`
- Licence service (Omori): admin token compared in constant time, 5 refused attempts per address lock it
  for 15 minutes (30 per hour overall), strict input checks, internal errors never returned to the caller;
  conditional (ETag) writes of the licence register, so two machines cannot activate the same key at the same time;
  the check accepts the full signed key and can require it (`LICENCE_EXIGER_CLE=1`)
- Contact form: a single server endpoint (`/api/contact`, no Netlify Forms): Origin required, length and field
  checks, honeypot, Google reCAPTCHA v3 (action, hostname, age and score checked server-side), global rate limits,
  then e-mail through Resend; no secret or API key is stored in the code
- Only public files are published (`dist/` on Netlify, `public/` on Vercel): server code and repo files are never served

- Automated checks: CodeQL code scanning (every push and weekly), Dependabot for npm packages and GitHub Actions,
  security unit tests + build checks on every push (`.github/workflows/tests.yml`)
- Conformity checklist (OWASP Top 10 2021 / ASVS 4.0 level 1): [docs/SECURITE.md](docs/SECURITE.md)

## Supported versions

Only the version currently deployed from the `main` branch is supported.

## Reporting a vulnerability

See also [`/.well-known/security.txt`](https://rached-chakchouk.vercel.app/.well-known/security.txt).


If you find a security issue, please report it privately via LinkedIn:
https://linkedin.com/in/rached-chakchouk

Please do not open a public issue for security problems.
I aim to acknowledge reports within 72 hours and to fix confirmed issues within 30 days,
and I will credit you if you wish once the fix is deployed.
