# Security Policy

## Scope

This repository hosts a static personal portfolio (HTML, CSS, vanilla JavaScript)
deployed on Netlify at https://rached-chakchouk.netlify.app.
It has no backend, no database, no user accounts and stores no personal data
from visitors.

## Security measures

- HTTPS enforced, with HSTS
- Content Security Policy restricting scripts, styles, fonts and connections
- Clickjacking protection (`frame-ancestors 'none'`, `X-Frame-Options: DENY`)
- `X-Content-Type-Options: nosniff`, strict `Referrer-Policy`, restrictive `Permissions-Policy`
- External links opened with `rel="noopener noreferrer"`
- Contact form: front-end validation, length limits and an anti-spam honeypot field;
  no secret or API key is stored in the code

## Reporting a vulnerability

If you find a security issue, please report it privately via LinkedIn:
https://linkedin.com/in/rached-chakchouk

Please do not open a public issue for security problems.
I will acknowledge your report as soon as possible.
