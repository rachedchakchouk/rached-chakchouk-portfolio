/* Bouton « Haut de page » commun à toutes les pages */
(function () {
  if (document.getElementById('toTop')) return;
  var css = '#toTop{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(64px + env(safe-area-inset-bottom,0px));z-index:900;width:44px;height:44px;border-radius:50%;' +
    'border:1px solid rgba(127,140,160,.35);background:rgba(255,255,255,.92);color:#0b1324;font:600 18px/1 system-ui,sans-serif;cursor:pointer;display:grid;place-items:center;' +
    'box-shadow:0 10px 24px -12px rgba(11,19,36,.45);opacity:0;transform:translateY(10px);pointer-events:none;transition:opacity .2s,transform .2s,border-color .2s;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}' +
    '#toTop.on{opacity:1;transform:none;pointer-events:auto}#toTop:hover{border-color:#2563c9}#toTop:focus-visible{outline:2px solid #2563c9;outline-offset:3px}' +
    ':root[data-theme="dark"] #toTop{background:rgba(15,21,34,.92);color:#eef2f8}' +
    '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) #toTop{background:rgba(15,21,34,.92);color:#eef2f8}}' +
    '@media print{#toTop{display:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var b = document.createElement('button');
  b.id = 'toTop'; b.type = 'button'; b.textContent = '↑'; b.tabIndex = -1;
  function label() {
    var en = (document.documentElement.getAttribute('lang') || 'fr').indexOf('en') === 0;
    var t = en ? 'Back to top' : 'Haut de page';
    b.setAttribute('aria-label', t); b.title = t;
    /* Libellés bilingues simples : <a data-fr="…" data-en="…"> */
    document.querySelectorAll('[data-fr][data-en]').forEach(function (e) { e.textContent = e.getAttribute(en ? 'data-en' : 'data-fr'); });
  }
  label();
  new MutationObserver(label).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  document.body.appendChild(b);
  var on = false;
  function upd() {
    var v = (window.scrollY || document.documentElement.scrollTop) > 600;
    if (v !== on) { on = v; b.classList.toggle('on', v); b.tabIndex = v ? 0 : -1; b.setAttribute('aria-hidden', v ? 'false' : 'true'); }
  }
  b.setAttribute('aria-hidden', 'true');
  window.addEventListener('scroll', upd, { passive: true }); upd();
  b.addEventListener('click', function () {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
})();
