// Netlify build (backup address + back-end): publishes only the public static files and the dashboard
// into ./dist — the functions are bundled separately from netlify/functions and never served as files.
import { copyPublic, injectSiteKey } from './build-common.mjs';

const OUT = 'dist';
copyPublic(OUT, ['_headers', 'robots.txt', 'dashboard', 'assets/dashboard.js']);
injectSiteKey(OUT, ['index.html', 'dashboard/index.html']);
console.log('Netlify site built in ./' + OUT);
