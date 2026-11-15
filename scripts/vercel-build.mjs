// Vercel build (main address): copies only the public static files into ./public
// (server code, repo docs and the private dashboard stay on the Netlify back-end).
import { writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { copyPublic, injectSiteKey } from './build-common.mjs';

const OUT = 'public';
copyPublic(OUT); // the dashboard is not published here: /dashboard redirects to the Netlify back-end
// Vercel Web Analytics on every public page (not on the private dashboard)
const VA = '<script defer src="/assets/va.js"></script>';
(function inject(dir) {
  for (const f of readdirSync(dir)) {
    const p = dir + '/' + f;
    if (statSync(p).isDirectory()) { inject(p); continue; }
    if (!f.endsWith('.html')) continue;
    const h = readFileSync(p, 'utf8');
    if (h.includes('/assets/va.js') || !h.includes('</head>')) continue;
    writeFileSync(p, h.replace('</head>', VA + '\n</head>'));
  }
})(OUT);
injectSiteKey(OUT, ['index.html']);
// Vercel is the main address: open to search engines (the repo robots.txt is the Netlify backup's, which blocks them)
writeFileSync(OUT + '/robots.txt', 'User-agent: *\nAllow: /\nDisallow: /dashboard/\nDisallow: /api/\nDisallow: /merci/\n\nSitemap: https://rached-chakchouk.vercel.app/sitemap.xml\n');
// Plan du site pour les moteurs de recherche (pages publiques, versions FR / EN)
const SITE = 'https://rached-chakchouk.vercel.app';
const TODAY = new Date().toISOString().slice(0, 10);
const PAGES = [['/', '1.0', true], ['/jobradar/', '0.8', true], ['/entretien/', '0.8', true], ['/entretien/qcm/', '0.7', true], ['/offshore-it-tunisie/', '0.7', false], ['/conditions/', '0.3', true]];
const alt = (u) => '<xhtml:link rel="alternate" hreflang="fr" href="' + SITE + u + '"/><xhtml:link rel="alternate" hreflang="en" href="' + SITE + u + '?lang=en"/>';
writeFileSync(OUT + '/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
  PAGES.map(([u, pr, bi]) => '  <url><loc>' + SITE + u + '</loc><lastmod>' + TODAY + '</lastmod><priority>' + pr + '</priority>' + (bi ? alt(u) : '') + '</url>').join('\n') + '\n</urlset>\n');
console.log('Vercel site built in ./' + OUT);
