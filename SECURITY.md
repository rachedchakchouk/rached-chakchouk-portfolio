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
  5 failed attempts lock logins for 15 minutes, and 60 failed attempts in an hour (all visitors together)
  lock them for the rest of the hour, against brute force spread over many addresses.
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
  for 15 minutes (30 per hour overall), strict input checks, internal errors never returned to the caller
- Contact form: front-end validation, length limits and an anti-spam honeypot field; the relay on the main
  address only accepts browser requests from the site itself (Origin required);
  no secret or API key is stored in the code

- Automated checks: CodeQL code scanning (every push and weekly) and Dependabot for npm packages and GitHub Actions

## Reporting a vulnerability

See also [`/.well-known/security.txt`](https://rached-chakchouk.vercel.app/.well-known/security.txt).


If you find a security issue, please report it privately via LinkedIn:
https://linkedin.com/in/rached-chakchouk

Please do not open a public issue for security problems.
I will acknowledge your report as soon as possible.
