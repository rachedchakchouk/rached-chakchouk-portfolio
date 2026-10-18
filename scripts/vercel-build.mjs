// Vercel build (main address): copies only the public static files into ./public
// (server code, repo docs and the private dashboard stay on the Netlify back-end).
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';

const OUT = 'public';
const KEEP = [
  'index.html', 'content.json', 'photo.jpg', 'preview.webp', 'favicon-32.png', 'apple-touch-icon.png',
  'Rached_Chakchouk_CV_FR.pdf', 'Rached_Chakchouk_CV_EN.pdf', 'LICENSE',
  'assets/site.js', 'assets/a11y.js', 'assets/carbon.js', 'merci', 'offshore-it-tunisie','entretien','jobradar','og-image.jpg','google08e1049584d7cb5a.html', 'feuille-de-route-ad11909f710d66a6', 'cv', 'bg', 'logos', 'projects', '.well-known'
];
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT + '/assets', { recursive: true });
for (const p of KEEP) if (existsSync(p)) cpSync(p, OUT + '/' + p, { recursive: true });
// Vercel is the main address: open to search engines (the repo robots.txt is the Netlify backup's, which blocks them)
writeFileSync(OUT + '/robots.txt', 'User-agent: *\nAllow: /\nDisallow: /dashboard/\nDisallow: /api/\nDisallow: /merci/\n\nSitemap: https://rached-chakchouk.vercel.app/sitemap.xml\n');
// Plan du site pour les moteurs de recherche (pages publiques, versions FR / EN)
const SITE = 'https://rached-chakchouk.vercel.app';
const TODAY = new Date().toISOString().slice(0, 10);
const PAGES = [['/', '1.0', true], ['/jobradar/', '0.8', true], ['/entretien/', '0.8', true], ['/entretien/qcm/', '0.7', true], ['/offshore-it-tunisie/', '0.7', false]];
const alt = (u) => '<xhtml:link rel="alternate" hreflang="fr" href="' + SITE + u + '"/><xhtml:link rel="alternate" hreflang="en" href="' + SITE + u + '?lang=en"/>';
writeFileSync(OUT + '/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
  PAGES.map(([u, pr, bi]) => '  <url><loc>' + SITE + u + '</loc><lastmod>' + TODAY + '</lastmod><priority>' + pr + '</priority>' + (bi ? alt(u) : '') + '</url>').join('\n') + '\n</urlset>\n');
console.log('Vercel site built in ./' + OUT);
