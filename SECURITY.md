# Security Policy

## Scope

This repository hosts a static personal portfolio (HTML, CSS, vanilla JavaScript)
deployed on Netlify at https://rached-chakchouk.netlify.app.
It uses a few Netlify Functions (anonymous visit analytics and a password-protected
admin API for editing content and files). It stores no personal data from visitors
(no cookies, IP addresses are never stored).

## Security measures

- HTTPS enforced, with HSTS
- Content Security Policy restricting scripts, styles, fonts and connections
- Clickjacking protection (`frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`)
- Admin API protected by a secret password (environment variable, constant-time comparison,
  brute-force delay); uploads limited in size and checked by real file signature;
  edited content sanitized and always rendered escaped
- `X-Content-Type-Options: nosniff`, strict `Referrer-Policy`, restrictive `Permissions-Policy`
- External links opened with `rel="noopener noreferrer"`
- Contact form: front-end validation, length limits and an anti-spam honeypot field;
  no secret or API key is stored in the code

## Reporting a vulnerability

If you find a security issue, please report it privately via LinkedIn:
https://linkedin.com/in/rached-chakchouk

Please do not open a public issue for security problems.
I will acknowledge your report as soon as possible.
