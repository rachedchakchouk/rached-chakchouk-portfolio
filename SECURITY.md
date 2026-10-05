# Security Policy

## Scope

This repository hosts a static personal portfolio (HTML, CSS, vanilla JavaScript)
deployed on Netlify at https://rached-chakchouk.netlify.app.
It uses a few Netlify Functions (anonymous visit analytics and a password-protected
admin API for editing content and files). It stores no personal data from visitors
(no cookies, IP addresses are never stored).

## Security measures

- HTTPS enforced, with HSTS
- Strict Content Security Policy: scripts only from the site itself (no inline scripts), restricted styles, fonts and connections
- Clickjacking protection (`frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`)
- Admin login: the password (environment variable) is sent once to `/api/admin/login`, which returns a
  signed session token valid for 2 hours (HMAC-SHA256); the password is never stored in the browser.
  5 failed attempts lock logins for 15 minutes.
- Rate limiting on the analytics endpoint (per visitor and per day), same-origin check, bot filtering;
  visit records are deleted after 13 months.
- Admin API: uploads limited in size and checked by real file signature;
  edited content sanitized and always rendered escaped
- `X-Content-Type-Options: nosniff`, strict `Referrer-Policy`, restrictive `Permissions-Policy`
- External links opened with `rel="noopener noreferrer"`
- Contact form: front-end validation, length limits and an anti-spam honeypot field;
  no secret or API key is stored in the code

## Reporting a vulnerability

See also [`/.well-known/security.txt`](https://rached-chakchouk.netlify.app/.well-known/security.txt).


If you find a security issue, please report it privately via LinkedIn:
https://linkedin.com/in/rached-chakchouk

Please do not open a public issue for security problems.
I will acknowledge your report as soon as possible.
