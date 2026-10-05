// Vercel mirror build: copies only the public static files into ./public
// (server code, repo docs and the private dashboard are not published on the mirror).
import { cpSync, mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';

const OUT = 'public';
const KEEP = [
  'index.html', 'content.json', 'photo.jpg', 'preview.webp', 'favicon-32.png', 'apple-touch-icon.png',
  'Rached_Chakchouk_CV_FR.pdf', 'Rached_Chakchouk_CV_EN.pdf', 'LICENSE',
  'assets/site.js', 'merci', 'cv', 'bg', 'logos', 'projects', '.well-known'
];
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT + '/assets', { recursive: true });
for (const p of KEEP) if (existsSync(p)) cpSync(p, OUT + '/' + p, { recursive: true });
// the mirror is a backup copy: keep search engines on the main site
writeFileSync(OUT + '/robots.txt', 'User-agent: *\nDisallow: /\n');
console.log('Vercel mirror built in ./' + OUT);
