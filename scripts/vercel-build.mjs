// Vercel build (main address): copies only the public static files into ./public
// (server code, repo docs and the private dashboard stay on the Netlify back-end).
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';

const OUT = 'public';
const KEEP = [
  'index.html', 'content.json', 'photo.jpg', 'preview.webp', 'favicon-32.png', 'apple-touch-icon.png',
  'Rached_Chakchouk_CV_FR.pdf', 'Rached_Chakchouk_CV_EN.pdf', 'LICENSE',
  'assets/site.js', 'assets/a11y.js', 'merci', 'offshore-it-tunisie','entretien', 'feuille-de-route-ad11909f710d66a6', 'cv', 'bg', 'logos', 'projects', '.well-known'
];
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT + '/assets', { recursive: true });
for (const p of KEEP) if (existsSync(p)) cpSync(p, OUT + '/' + p, { recursive: true });
// Vercel is the main address: open to search engines (the repo robots.txt is the Netlify backup's, which blocks them)
writeFileSync(OUT + '/robots.txt', 'User-agent: *\nAllow: /\nDisallow: /dashboard/\nDisallow: /api/\n');
console.log('Vercel site built in ./' + OUT);
