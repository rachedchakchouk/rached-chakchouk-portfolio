/* Accessibility panel: narrator (text-to-speech), magnifier + text size, colour-blind & high-contrast modes.
   Shared by the portfolio and its sub-pages. Settings persist in localStorage ("a11y"). */
(function () {
  'use strict';
  var root = document.documentElement;
  function get() { try { return JSON.parse(localStorage.getItem('a11y') || '{}') || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem('a11y', JSON.stringify(S)); } catch (e) {} }
  var S = get();
  var EN = function () { return (root.getAttribute('data-lang') || root.getAttribute('lang') || 'fr').slice(0, 2) === 'en'; };
  var T = {
    fr: { open: 'Accessibilité', title: 'Accessibilité', narr: 'Narrateur', narrHint: 'Cliquez sur un texte pour l’entendre', readPage: 'Lire la page', stop: 'Arrêter', loupe: 'Loupe', loupeHint: 'Agrandit le texte survolé', size: 'Taille du texte', cvd: 'Couleurs adaptées (daltonisme)', contrast: 'Contraste élevé', links: 'Souligner les liens', motion: 'Réduire les animations', reset: 'Réinitialiser', close: 'Fermer', noTts: 'Synthèse vocale indisponible sur ce navigateur' },
    en: { open: 'Accessibility', title: 'Accessibility', narr: 'Narrator', narrHint: 'Click any text to hear it', readPage: 'Read the page', stop: 'Stop', loupe: 'Magnifier', loupeHint: 'Enlarges the text under the pointer', size: 'Text size', cvd: 'Colour-blind friendly colours', contrast: 'High contrast', links: 'Underline links', motion: 'Reduce motion', reset: 'Reset', close: 'Close', noTts: 'Speech synthesis is not available in this browser' }
  };
  function t(k) { return T[EN() ? 'en' : 'fr'][k]; }

  var css = [
    '.a11y-fab{position:fixed;left:16px;bottom:16px;z-index:9998;width:48px;height:48px;border-radius:50%;border:2px solid #fff;background:#2563c9;color:#fff;font:700 22px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.3);display:grid;place-items:center}',
    '.a11y-fab:focus-visible,.a11y-panel :focus-visible{outline:3px solid #f5a524;outline-offset:2px}',
    '.a11y-panel{position:fixed;left:16px;bottom:74px;z-index:9999;width:min(320px,calc(100vw - 32px));max-height:calc(100vh - 100px);overflow:auto;background:#fff;color:#0b1324;border:1px solid #cfd7e3;border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.3);padding:14px;font:15px/1.4 system-ui,"Segoe UI",sans-serif}',
    '.a11y-panel[hidden]{display:none}',
    '@media (max-width:899px){html.a11y-raise .a11y-fab{bottom:92px}html.a11y-raise .a11y-panel{bottom:150px;max-height:calc(100vh - 170px)}html.a11y-raise .a11y-lens{bottom:92px}}',
    '.a11y-panel h2{font-size:16px;margin:0 0 10px;display:flex;justify-content:space-between;align-items:center}',
    '.a11y-panel h2 button{border:0;background:none;font-size:20px;cursor:pointer;color:inherit}',
    '.a11y-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid #e2e7ef}',
    '.a11y-row small{display:block;color:#5a667a;font-size:12.5px}',
    '.a11y-sw{appearance:none;-webkit-appearance:none;width:44px;height:26px;border-radius:13px;background:#c4ccd8;position:relative;cursor:pointer;flex:0 0 auto;margin:0}',
    '.a11y-sw::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:left .15s}',
    '.a11y-sw:checked{background:#2563c9}.a11y-sw:checked::after{left:21px}',
    '.a11y-btns{display:flex;gap:6px;flex-wrap:wrap}',
    '.a11y-btns button,.a11y-act{font:600 13px system-ui,sans-serif;border:1px solid #cfd7e3;background:#f6f7fb;color:#0b1324;border-radius:10px;padding:7px 11px;cursor:pointer;min-height:36px}',
    '.a11y-btns button[aria-pressed="true"]{background:#2563c9;border-color:#2563c9;color:#fff}',
    '.a11y-lens{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9997;max-width:min(900px,calc(100vw - 32px));background:#0b1324;color:#fff;border:3px solid #f5a524;border-radius:14px;padding:12px 18px;font:600 clamp(22px,3.4vw,34px)/1.3 system-ui,sans-serif;pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,.4)}',
    '.a11y-lens[hidden]{display:none}',
    '.a11y-speaking{outline:3px solid #f5a524 !important;outline-offset:3px;border-radius:4px}',
    'html.a11y-narr body *{cursor:help}',
    'html.a11y-links a{text-decoration:underline !important;text-underline-offset:3px}',
    'html.a11y-motion *,html.a11y-motion *::before,html.a11y-motion *::after{animation:none !important;transition:none !important;scroll-behavior:auto !important}',
    /* colour-blind friendly: blue/orange pair instead of blue/red/green, applied to shared tokens */
    'html.a11y-cvd{--bad:#d55e00 !important;--bad-soft:rgba(213,94,0,.14) !important;--str:#0072b2 !important;--ann:#b35a00 !important;--accent-2:#e69f00 !important}',
    'html.a11y-cvd .e.bad,html.a11y-cvd .n.bad rect{stroke-dasharray:2 3 !important}',
    /* high contrast */
    'html.a11y-contrast{--muted:var(--fg) !important;--quiet:var(--ink) !important;--rule:currentColor !important;--line:currentColor !important}',
    'html.a11y-contrast body{filter:contrast(1.15)}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- UI ---------- */
  var fab = document.createElement('button');
  fab.type = 'button'; fab.className = 'a11y-fab'; fab.setAttribute('aria-haspopup', 'dialog'); fab.setAttribute('aria-expanded', 'false'); fab.textContent = '♿';
  var panel = document.createElement('div');
  panel.className = 'a11y-panel'; panel.setAttribute('role', 'dialog'); panel.hidden = true; panel.id = 'a11yPanel';
  var lens = document.createElement('div'); lens.className = 'a11y-lens'; lens.hidden = true; lens.setAttribute('aria-hidden', 'true');
  document.body.appendChild(fab); document.body.appendChild(panel); document.body.appendChild(lens);
  fab.setAttribute('aria-controls', 'a11yPanel');

  function sw(key, label, hint) {
    return '<label class="a11y-row"><span>' + label + (hint ? '<small>' + hint + '</small>' : '') + '</span><input class="a11y-sw" type="checkbox" role="switch" data-k="' + key + '"' + (S[key] ? ' checked' : '') + '></label>';
  }
  function draw() {
    fab.setAttribute('aria-label', t('open')); fab.title = t('open');
    panel.setAttribute('aria-label', t('title'));
    var sizes = [100, 115, 130, 150];
    panel.innerHTML = '<h2>' + t('title') + '<button type="button" data-close aria-label="' + t('close') + '">×</button></h2>' +
      sw('narr', t('narr'), hasTts ? t('narrHint') : t('noTts')) +
      '<div class="a11y-row"><span></span><span class="a11y-btns"><button type="button" class="a11y-act" data-read>' + t('readPage') + '</button><button type="button" class="a11y-act" data-stop>' + t('stop') + '</button></span></div>' +
      sw('loupe', t('loupe'), t('loupeHint')) +
      '<div class="a11y-row"><span>' + t('size') + '</span><span class="a11y-btns">' + sizes.map(function (z) { return '<button type="button" data-size="' + z + '" aria-pressed="' + ((S.size || 100) === z) + '">' + z + '%</button>'; }).join('') + '</span></div>' +
      sw('cvd', t('cvd')) + sw('contrast', t('contrast')) + sw('links', t('links')) + sw('motion', t('motion')) +
      '<div class="a11y-row"><span></span><button type="button" class="a11y-act" data-reset>' + t('reset') + '</button></div>';
  }
  function apply() {
    ['narr', 'cvd', 'contrast', 'links', 'motion'].forEach(function (k) { root.classList.toggle('a11y-' + k, !!S[k]); });
    var z = (S.size || 100) / 100;
    document.body.style.zoom = z === 1 ? '' : z;
    if (!S.loupe) lens.hidden = true;
    if (!S.narr) stopSpeak();
  }
  function openP(o) {
    panel.hidden = !o; fab.setAttribute('aria-expanded', String(o));
    if (o) { draw(); var f = panel.querySelector('input,button:not([data-close])'); if (f) f.focus(); } else fab.focus();
  }
  fab.addEventListener('click', function () { openP(panel.hidden); });
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') openP(false); });
  panel.addEventListener('change', function (e) {
    var k = e.target.getAttribute('data-k'); if (!k) return;
    S[k] = e.target.checked; save(); apply();
    if (k === 'narr' && S.narr) speak(EN() ? 'Narrator on. Click any text to hear it.' : 'Narrateur activé. Cliquez sur un texte pour l’entendre.');
  });
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-close')) openP(false);
    else if (b.hasAttribute('data-size')) { S.size = +b.getAttribute('data-size'); save(); apply(); draw(); panel.querySelector('[data-size="' + S.size + '"]').focus(); }
    else if (b.hasAttribute('data-read')) readPage();
    else if (b.hasAttribute('data-stop')) stopSpeak();
    else if (b.hasAttribute('data-reset')) { S = {}; save(); apply(); draw(); }
  });

  /* ---------- narrator ---------- */
  var hasTts = 'speechSynthesis' in window;
  var lastEl = null;
  function voiceLang() { return EN() ? 'en-US' : 'fr-FR'; }
  function stopSpeak() { if (hasTts) speechSynthesis.cancel(); if (lastEl) lastEl.classList.remove('a11y-speaking'); lastEl = null; }
  function speak(text, el) {
    if (!hasTts || !text) return;
    stopSpeak();
    var u = new SpeechSynthesisUtterance(text.replace(/\s+/g, ' ').trim());
    u.lang = voiceLang(); u.rate = 0.95;
    var v = speechSynthesis.getVoices().filter(function (x) { return x.lang && x.lang.slice(0, 2) === u.lang.slice(0, 2); })[0];
    if (v) u.voice = v;
    if (el) { lastEl = el; el.classList.add('a11y-speaking'); u.onend = u.onerror = function () { if (lastEl === el) { el.classList.remove('a11y-speaking'); lastEl = null; } }; }
    speechSynthesis.speak(u);
  }
  function visible(el) { return el.offsetParent !== null || getComputedStyle(el).position === 'fixed'; }
  function readPage() {
    var main = document.querySelector('main') || document.body;
    var parts = [].slice.call(document.querySelectorAll('h1,header p,main h2,main h3,main p,main li,.explain p')).filter(function (el) { return visible(el) && !panel.contains(el); }).map(function (el) { return el.innerText; });
    speak(parts.join('. ') || main.innerText);
  }
  var TEXT_SEL = 'p,li,h1,h2,h3,h4,dt,dd,td,th,figcaption,blockquote,label,button,a,summary,.chip,.tag';
  document.addEventListener('click', function (e) {
    if (!S.narr || panel.contains(e.target) || e.target === fab) return;
    var el = e.target.closest(TEXT_SEL); if (!el) return;
    var txt = el.getAttribute('aria-label') || el.innerText;
    speak(txt, el);
  }, true);
  /* pages can ask the narrator to read something (e.g. the current step) */
  window.a11ySpeak = function (text) { if (S.narr) speak(text); };

  /* ---------- magnifier (hover lens) ---------- */
  var lensTimer = null;
  document.addEventListener('mouseover', function (e) {
    if (!S.loupe || panel.contains(e.target)) return;
    var el = e.target.closest('p,li,h1,h2,h3,h4,a,button,label,td,th,dd,dt,span,strong,em,code,.ln,text');
    var txt = el && (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim();
    clearTimeout(lensTimer);
    if (!txt || txt.length > 400) { lensTimer = setTimeout(function () { lens.hidden = true; }, 250); return; }
    lens.textContent = txt; lens.hidden = false;
  });
  document.addEventListener('focusin', function (e) {
    if (!S.loupe || panel.contains(e.target)) return;
    var txt = (e.target.getAttribute('aria-label') || e.target.innerText || '').trim();
    if (txt) { lens.textContent = txt.slice(0, 400); lens.hidden = false; }
  });

  /* redraw labels when the page language changes */
  new MutationObserver(function () { if (!panel.hidden) draw(); fab.setAttribute('aria-label', t('open')); }).observe(root, { attributes: true, attributeFilter: ['data-lang', 'lang'] });
  draw(); apply();
})();
