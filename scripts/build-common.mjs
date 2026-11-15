// Shared by scripts/vercel-build.mjs and scripts/netlify-build.mjs:
// only the public static files below are published (never server code, repo docs or config).
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs';

export const PUBLIC = [
  'index.html', 'content.json', 'photo.jpg', 'preview.webp', 'favicon-32.png', 'apple-touch-icon.png',
  'Rached_Chakchouk_CV_FR.pdf', 'Rached_Chakchouk_CV_EN.pdf', 'LICENSE',
  'assets/site.js', 'assets/va.js', 'assets/a11y.js', 'assets/carbon.js', 'assets/totop.js', 'assets/float.js',
  'merci', 'offshore-it-tunisie', 'entretien', 'jobradar', 'conditions', 'og-image.jpg', 'google08e1049584d7cb5a.html',
  'feuille-de-route-ad11909f710d66a6', 'cv', 'bg', 'logos', 'projects', '.well-known'
];

export function copyPublic(out, extra = []) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out + '/assets', { recursive: true });
  for (const p of [...PUBLIC, ...extra]) if (existsSync(p)) cpSync(p, out + '/' + p, { recursive: true });
}

// reCAPTCHA v3 public site key (env RECAPTCHA_SITE_KEY) -> <meta name="recaptcha-site-key" content=""> of the given pages.
// Without it the forms work without reCAPTCHA; a secret without a site key would refuse every request, so the build fails.
export function injectSiteKey(out, pages) {
  const key = (process.env.RECAPTCHA_SITE_KEY || '').trim();
  if (key && !/^[\w-]{20,80}$/.test(key)) throw new Error('RECAPTCHA_SITE_KEY has an unexpected format');
  if (!key) {
    if (process.env.RECAPTCHA_SECRET_KEY) throw new Error('RECAPTCHA_SECRET_KEY is set but RECAPTCHA_SITE_KEY is missing: every protected request would be refused');
    return false;
  }
  for (const p of pages) {
    const file = out + '/' + p, h = readFileSync(file, 'utf8');
    const res = h.replace('<meta name="recaptcha-site-key" content="">', '<meta name="recaptcha-site-key" content="' + key + '">');
    if (res === h) throw new Error('recaptcha-site-key placeholder not found in ' + p);
    writeFileSync(file, res);
  }
  console.log('reCAPTCHA v3 site key injected into ' + pages.join(', '));
  return true;
}
