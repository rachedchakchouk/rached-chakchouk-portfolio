/* Carbon counter: estimates the energy use and CO2e footprint of the current visit from the bytes actually
   transferred (Resource Timing API), using the Sustainable Web Design model v4 (the model behind CO2.js / Website Carbon).
   Per-page figures update live; the session total adds up the pages seen in this tab (sessionStorage). No data leaves the browser. */
(function () {
  'use strict';
  var root = document.documentElement;
  // SWD v4: operational + embodied energy, kWh per GB transferred
  var KWH_PER_GB = (0.055 + 0.012) + (0.059 + 0.013) + (0.080 + 0.081); // data centres + networks + user devices = 0.300
  var GRID_G_PER_KWH = 494;   // global average grid intensity used by CO2.js (Ember)
  var RATINGS = [[0.040, 'A+'], [0.079, 'A'], [0.145, 'B'], [0.209, 'C'], [0.278, 'D'], [0.359, 'E'], [Infinity, 'F']];
  var RCOL = { 'A+': '#0f9d58', 'A': '#34a853', 'B': '#7cb342', 'C': '#f9ab00', 'D': '#f57c00', 'E': '#e8590c', 'F': '#d93025' };
  var EN = function () { return (root.getAttribute('data-lang') || root.getAttribute('lang') || 'fr').slice(0, 2) === 'en'; };
  var T = {
    fr: { btn: 'Empreinte carbone de cette page', title: 'Empreinte carbone', page: 'Cette page', session: 'Votre visite', pages: 'pages', data: 'Données transférées', energy: 'Énergie', co2: 'CO₂e émis', rating: 'Note', eq: 'Équivaut à', led: 'd’une ampoule LED de 10 W', km: 'en voiture thermique', note: 'Estimation selon le modèle Sustainable Web Design v4 (0,3 kWh/Go, 494 g CO₂e/kWh). Calculée dans votre navigateur, rien n’est envoyé.', close: 'Fermer', cached: 'Les fichiers déjà en cache ne comptent pas : revenir coûte presque zéro.' },
    en: { btn: 'Carbon footprint of this page', title: 'Carbon footprint', page: 'This page', session: 'Your visit', pages: 'pages', data: 'Data transferred', energy: 'Energy', co2: 'CO₂e emitted', rating: 'Rating', eq: 'Same as', led: 'of a 10 W LED bulb', km: 'in a petrol car', note: 'Estimate based on the Sustainable Web Design model v4 (0.3 kWh/GB, 494 g CO₂e/kWh). Computed in your browser, nothing is sent.', close: 'Close', cached: 'Files already cached do not count: coming back costs almost nothing.' }
  };
  function t(k) { return T[EN() ? 'en' : 'fr'][k]; }

  var css = [
    '.co2-fab{position:fixed;right:16px;bottom:16px;z-index:9996;display:flex;align-items:center;gap:8px;border:1px solid rgba(127,140,160,.35);background:rgba(255,255,255,.92);color:#0b1324;border-radius:999px;padding:7px 12px 7px 10px;font:600 13px/1 system-ui,"Segoe UI",sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.18);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}',
    ':root[data-theme="dark"] .co2-fab{background:rgba(15,21,34,.92);color:#eef2f8}',
    '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .co2-fab{background:rgba(15,21,34,.92);color:#eef2f8}}',
    '.co2-fab b{display:inline-grid;place-items:center;min-width:26px;height:20px;border-radius:6px;color:#fff;font-size:11.5px;padding:0 4px}',
    '.co2-fab:focus-visible,.co2-card :focus-visible{outline:3px solid #f5a524;outline-offset:2px}',
    '.co2-card{position:fixed;right:16px;bottom:64px;z-index:9999;width:min(330px,calc(100vw - 32px));background:#fff;color:#0b1324;border:1px solid #cfd7e3;border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.3);padding:14px 16px;font:14px/1.45 system-ui,"Segoe UI",sans-serif}',
    '.co2-card[hidden]{display:none}',
    '.co2-card h2{font-size:16px;margin:0 0 8px;display:flex;justify-content:space-between;align-items:center}',
    '.co2-card h2 button{border:0;background:none;font-size:20px;cursor:pointer;color:inherit}',
    '.co2-card h3{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#5a667a;margin:12px 0 4px}',
    '.co2-card dl{display:grid;grid-template-columns:1fr auto;gap:3px 12px;margin:0}',
    '.co2-card dd{margin:0;font-weight:600;font-variant-numeric:tabular-nums;text-align:right}',
    '.co2-scale{display:flex;gap:3px;margin:10px 0 2px}',
    '.co2-scale span{flex:1;text-align:center;font:700 11px system-ui,sans-serif;color:#fff;border-radius:5px;padding:4px 0;opacity:.35}',
    '.co2-scale span.on{opacity:1;transform:scale(1.12);box-shadow:0 2px 8px rgba(0,0,0,.25)}',
    '.co2-card p{margin:10px 0 0;color:#5a667a;font-size:12.5px}',
    '@media (max-width:899px){html.a11y-raise .co2-fab{bottom:92px}html.a11y-raise .co2-card{bottom:140px}}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var fab = document.createElement('button'); fab.type = 'button'; fab.className = 'co2-fab'; fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'co2Card');
  var card = document.createElement('div'); card.className = 'co2-card'; card.id = 'co2Card'; card.setAttribute('role', 'dialog'); card.hidden = true;
  document.body.appendChild(fab); document.body.appendChild(card);

  /* ---------- measuring ---------- */
  var seen = {}, bytes = 0;
  function add(e) {
    var key = e.name + '|' + e.startTime; if (seen[key]) return; seen[key] = 1;
    bytes += e.transferSize || 0;
  }
  try {
    performance.getEntriesByType('navigation').forEach(add);
    performance.getEntriesByType('resource').forEach(add);
    new PerformanceObserver(function (l) { l.getEntries().forEach(add); schedule(); }).observe({ type: 'resource', buffered: false });
  } catch (e) {}

  function calc(b) { var kwh = b / 1e9 * KWH_PER_GB; return { b: b, kwh: kwh, g: kwh * GRID_G_PER_KWH }; }
  function rating(g) { for (var i = 0; i < RATINGS.length; i++) if (g <= RATINGS[i][0]) return RATINGS[i][1]; return 'F'; }
  function fmtB(b) { return b < 1024 ? b + ' o' : b < 1048576 ? (b / 1024).toFixed(0) + (EN() ? ' KB' : ' Ko') : (b / 1048576).toFixed(2) + (EN() ? ' MB' : ' Mo'); }
  function num(x, d) { return x.toLocaleString(EN() ? 'en-GB' : 'fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d }); }
  function fmtG(g) { return g < 0.01 ? num(g * 1000, 1) + ' mg' : num(g, g < 1 ? 3 : 2) + ' g'; }
  function fmtE(kwh) { var wh = kwh * 1000; return wh < 1 ? num(wh * 1000, 1) + ' mWh' : num(wh, 2) + ' Wh'; }

  /* session total: bytes per page path in this tab */
  var KEY = 'co2_session';
  function sess() { try { return JSON.parse(sessionStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  var pageId = location.pathname + '#' + Date.now();
  function store() { try { var s = sess(); s[pageId] = bytes; sessionStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  var timer = null;
  function schedule() { if (!timer) timer = setTimeout(function () { timer = null; update(); }, 400); }
  function update() {
    store();
    var p = calc(bytes), r = rating(p.g);
    fab.innerHTML = '<span aria-hidden="true">🌱</span><span>' + fmtG(p.g) + ' CO₂e</span><b style="background:' + RCOL[r] + '">' + r + '</b>';
    fab.setAttribute('aria-label', t('btn') + ' : ' + fmtG(p.g) + ' CO₂e, ' + t('rating') + ' ' + r); fab.title = t('btn');
    if (!card.hidden) drawCard();
  }
  function drawCard() {
    var p = calc(bytes), r = rating(p.g), s = sess(), sb = 0, n = 0;
    for (var k in s) { sb += s[k]; n++; }
    var tot = calc(sb);
    var ledS = tot.kwh * 1000 / 10 * 3600;           // seconds of a 10 W bulb
    var carM = tot.g / 120 * 1000;                   // ~120 g CO2e per km for a petrol car
    card.setAttribute('aria-label', t('title'));
    card.innerHTML = '<h2>🌱 ' + t('title') + '<button type="button" data-close aria-label="' + t('close') + '">×</button></h2>' +
      '<div class="co2-scale" aria-hidden="true">' + RATINGS.map(function (x) { return '<span class="' + (x[1] === r ? 'on' : '') + '" style="background:' + RCOL[x[1]] + '">' + x[1] + '</span>'; }).join('') + '</div>' +
      '<h3>' + t('page') + '</h3><dl><dt>' + t('rating') + '</dt><dd>' + r + '</dd><dt>' + t('data') + '</dt><dd>' + fmtB(p.b) + '</dd><dt>' + t('energy') + '</dt><dd>' + fmtE(p.kwh) + '</dd><dt>' + t('co2') + '</dt><dd>' + fmtG(p.g) + '</dd></dl>' +
      '<h3>' + t('session') + ' · ' + n + ' ' + t('pages') + '</h3><dl><dt>' + t('data') + '</dt><dd>' + fmtB(tot.b) + '</dd><dt>' + t('energy') + '</dt><dd>' + fmtE(tot.kwh) + '</dd><dt>' + t('co2') + '</dt><dd>' + fmtG(tot.g) + '</dd>' +
      '<dt>' + t('eq') + '</dt><dd>' + num(ledS, ledS < 10 ? 1 : 0) + ' s ' + '</dd><dt></dt><dd style="font-weight:400">' + t('led') + '</dd><dt></dt><dd>' + num(carM, carM < 10 ? 1 : 0) + ' m ' + t('km') + '</dd></dl>' +
      '<p>' + t('cached') + '</p><p>' + t('note') + '</p>';
  }
  function openC(o) { card.hidden = !o; fab.setAttribute('aria-expanded', String(o)); if (o) { drawCard(); card.querySelector('[data-close]').focus(); } else fab.focus(); }
  fab.addEventListener('click', function () { openC(card.hidden); });
  card.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) openC(false); });
  card.addEventListener('keydown', function (e) { if (e.key === 'Escape') openC(false); });
  new MutationObserver(update).observe(root, { attributes: true, attributeFilter: ['data-lang', 'lang'] });
  window.addEventListener('load', function () { setTimeout(update, 300); });
  update();
})();
