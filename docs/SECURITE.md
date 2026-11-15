# Sécurité — conformité du portfolio

Référentiels : **OWASP Top 10 (2021)** et **OWASP ASVS 4.0, niveau 1** (exigences applicables à un site vitrine
avec une petite API d'administration). Dernière revue : 15 novembre 2026.

> Ce document est une **auto-évaluation**. Il n'existe pas de certification officielle pour un portfolio personnel ;
> les contrôles externes de la dernière section donnent une note vérifiable par n'importe qui.

## OWASP Top 10 (2021)

| Risque | Mesures | Où |
|---|---|---|
| A01 Contrôle d'accès | API admin protégée par jeton signé HMAC-SHA256 (2 h), vérifié sur chaque route ; session « mot de passe provisoire » limitée au changement de mot de passe ; dashboard servi seulement par Netlify ; routes licences admin protégées par jeton | `netlify/lib/analytics.mjs`, `netlify/functions/admin-*.mjs`, `stats.mjs`, `licences.mjs` |
| A02 Défaillances cryptographiques | HTTPS + HSTS `preload` ; mots de passe en scrypt salé ; comparaisons à temps constant ; secret de session dédié (`SESSION_SECRET`) ; licences signées Ed25519 | `vercel.json`, `_headers`, `netlify/lib/auth.mjs` |
| A03 Injection / XSS | Contenu toujours échappé avant `innerHTML` ; URL filtrées à l'enregistrement (pas de `javascript:` / `data:`) ; CSP sans `unsafe-inline` ni `unsafe-eval` pour les scripts ; e-mails envoyés en JSON (pas d'injection d'en-têtes, sujet sans retour à la ligne) | `assets/site.js`, `assets/dashboard.js`, `sanitizeContent`, `contact.mjs` |
| A04 Conception non sécurisée | Limites anti-abus sur toutes les routes d'écriture (connexion, mot de passe oublié, contact, statistiques, licences) ; reCAPTCHA v3 avant comptage | `netlify/functions/*` |
| A05 Mauvaise configuration | En-têtes de sécurité identiques sur les deux hébergeurs (vérifiés en CI) ; seuls les fichiers publics sont publiés ; erreurs internes jamais renvoyées | `vercel.json`, `_headers`, `scripts/build-common.mjs`, `tests.yml` |
| A06 Composants vulnérables | Une seule dépendance (`@netlify/blobs`) ; Dependabot hebdomadaire ; CodeQL | `.github/` |
| A07 Authentification | Mot de passe ≥ 10 caractères, 3 types ; verrouillage après 5 échecs + plafond global ; mot de passe provisoire à usage unique (15 min) envoyé à une adresse fixe ; changement de mot de passe = déconnexion des autres sessions ; jeton en `sessionStorage` (jamais le mot de passe) | `netlify/lib/auth.mjs`, `admin-login.mjs`, `admin-password.mjs`, `admin-forgot.mjs` |
| A08 Intégrité | Fichiers envoyés vérifiés par signature réelle (PDF, JPEG, PNG, WebP) ; registre des licences écrit de façon conditionnelle (ETag) ; réponses de licence signées | `checkUpload`, `licences.mjs` |
| A09 Journalisation | Refus reCAPTCHA et erreurs d'envoi journalisés (logs Netlify) ; aucune IP stockée (empreinte salée du jour seulement) | `contact.mjs`, `recaptcha.mjs`, `track.mjs` |
| A10 SSRF | Les fonctions n'appellent que des adresses fixes (Netlify, Google, Resend) ; aucune URL fournie par l'utilisateur n'est appelée | `api/*.js`, `netlify/functions/*` |

## ASVS 4.0 niveau 1 — points vérifiés

| Exigence | État |
|---|---|
| V2.1 Mots de passe ≥ 8 caractères (ici 10, 3 types) | ✅ |
| V2.2 Protection contre le bourrage d'identifiants / force brute | ✅ verrouillage + reCAPTCHA |
| V2.5 Récupération de compte sans révéler d'information, lien à durée limitée | ✅ mot de passe provisoire 15 min, adresse fixe masquée |
| V3 Sessions : jeton aléatoire/signé, expiration, invalidation au changement de mot de passe | ✅ |
| V4 Contrôle d'accès côté serveur sur chaque route | ✅ |
| V5.1 Validation des entrées (types, longueurs, formats) | ✅ |
| V5.3 Encodage des sorties (HTML) | ✅ |
| V8.3 Pas de données sensibles dans l'URL ni le stockage local persistant | ✅ jeton en `sessionStorage`, mot de passe jamais stocké |
| V9.1 TLS partout + HSTS | ✅ |
| V11.1 Limites anti-abus de la logique métier | ✅ |
| V12.1 Fichiers envoyés : taille et type réels vérifiés | ✅ |
| V13.1 API : Origin vérifié, méthodes et types de contenu contrôlés | ✅ |
| V14.4 En-têtes HTTP de sécurité (CSP, HSTS, XCTO, XFO, Referrer-Policy) | ✅ |

## Risques connus et acceptés

- **Licences Omori** : tant que `LICENCE_EXIGER_CLE` n'est pas à `1`, une ancienne version d'Omori peut encore
  vérifier une licence avec son seul identifiant (`LIC-AAAA-NNNN`, prévisible). À activer dès que toutes les versions
  en circulation envoient le champ `cle`.
- Le chemin `/api/licences-dddb99be0d` figure dans le dépôt public : ce n'est pas un secret, le jeton admin et les
  signatures assurent la protection.
- Les limites du formulaire de contact sont globales (20/h, 60/jour) : un robot qui passerait reCAPTCHA pourrait
  les atteindre ; le visiteur voit alors un message et l'adresse e-mail à copier.
- `style-src 'unsafe-inline'` est conservé (styles en ligne des pages) : risque faible, les scripts restent stricts.

## Contrôles externes à lancer (note publique vérifiable)

| Outil | Objectif |
|---|---|
| https://developer.mozilla.org/en-US/observatory | en-têtes HTTP — viser **A+** |
| https://securityheaders.com | en-têtes HTTP — viser **A** |
| https://www.ssllabs.com/ssltest/ | TLS (géré par Vercel / Netlify) — **A+** attendu |
| https://hstspreload.org | état du préchargement HSTS des deux domaines |
| https://internet.nl | test global (HTTPS, en-têtes) |

À relancer après chaque changement d'en-têtes ou d'hébergement.
