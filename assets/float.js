/* FloatKit : rend un bouton flottant déplaçable (glisser) et fermable.
   Une fois fermé, le bouton est remplacé par un bouton « normal » dans le pied de page (non flottant).
   Position et état sont mémorisés dans localStorage ("float_<clé>"). Utilisé par a11y.js et carbon.js. */
(function () {
  'use strict';
  if (window.FloatKit) return;
  var root = document.documentElement;
  var EN = function () { return (root.getAttribute('data-lang') || root.getAttribute('lang') || 'fr').slice(0, 2) === 'en'; };
  var css = [
    '.fk-wrap{position:fixed;z-index:9996;display:flex;align-items:center;touch-action:none}',
    '.fk-wrap.fk-drag{cursor:grabbing;opacity:.9}.fk-wrap.fk-drag *{cursor:grabbing!important}',
    '.fk-wrap>button:first-child{position:static!important;left:auto!important;right:auto!important;bottom:auto!important;top:auto!important}',
    '.fk-x{position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;border:1px solid rgba(127,140,160,.5);background:#fff;color:#0b1324;font:700 13px/1 system-ui,sans-serif;cursor:pointer;display:grid;place-items:center;padding:0;opacity:0;transition:opacity .15s;box-shadow:0 2px 6px rgba(0,0,0,.25)}',
    '.fk-wrap:hover .fk-x,.fk-wrap:focus-within .fk-x{opacity:1}',
    '@media (hover:none){.fk-x{opacity:1;width:26px;height:26px;top:-10px;right:-10px}}',
    '.fk-x:focus-visible{outline:3px solid #f5a524;outline-offset:1px;opacity:1}',
    '.fk-dock{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:18px auto 8px;padding:0 16px;max-width:1280px}',
    '.fk-dock:empty{display:none}',
    '.fk-dock button{font:600 13px system-ui,"Segoe UI",sans-serif;min-height:38px;padding:0 14px;border-radius:999px;border:1px solid rgba(127,140,160,.45);background:transparent;color:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px}',
    '.fk-dock button:hover{border-color:#2563c9}.fk-dock button:focus-visible{outline:3px solid #f5a524;outline-offset:2px}',
    '@media print{.fk-wrap,.fk-dock{display:none}}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function load(k) { try { return JSON.parse(localStorage.getItem('float_' + k) || '{}') || {}; } catch (e) { return {}; } }
  function save(k, v) { try { localStorage.setItem('float_' + k, JSON.stringify(v)); } catch (e) {} }

  var dock = null;
  function getDock() {
    if (dock) return dock;
    dock = document.createElement('div'); dock.className = 'fk-dock';
    var host = document.querySelector('body > footer, footer') ;
    if (host && host.parentNode) host.parentNode.insertBefore(dock, host.nextSibling);
    else { var s = document.querySelector('body > script'); document.body.insertBefore(dock, s || null); }
    return dock;
  }

  /* Place un panneau fixe à côté de son ancre, sans sortir de l'écran */
  function placeNear(panel, anchor) {
    var vw = innerWidth, vh = innerHeight, m = 12;
    panel.style.right = 'auto'; panel.style.bottom = 'auto';
    var pw = panel.offsetWidth, ph = panel.offsetHeight;
    var r = anchor && anchor.getBoundingClientRect();
    var visibleAnchor = r && r.width && r.bottom > 0 && r.top < vh;
    var x, y;
    if (visibleAnchor) {
      x = Math.min(Math.max(m, r.left + r.width / 2 - pw / 2), vw - pw - m);
      y = r.top - ph - 10; if (y < m) y = r.bottom + 10;
      if (y + ph > vh - m) y = Math.max(m, vh - ph - m);
    } else { x = (vw - pw) / 2; y = Math.max(m, (vh - ph) / 2); }
    panel.style.left = Math.round(x) + 'px'; panel.style.top = Math.round(y) + 'px';
  }

  /* opts : key, fab, labels{fr,en} (dock + fermer), icon, onOpen(anchor) */
  function make(o) {
    var S = load(o.key);
    var wrap = document.createElement('div'); wrap.className = 'fk-wrap fk-' + o.key;
    var x = document.createElement('button'); x.type = 'button'; x.className = 'fk-x'; x.textContent = '×';
    o.fab.parentNode.insertBefore(wrap, o.fab); wrap.appendChild(o.fab); wrap.appendChild(x);
    var dbtn = document.createElement('button'); dbtn.type = 'button';
    function L() { return o.labels[EN() ? 'en' : 'fr']; }
    function label() {
      var l = L();
      x.setAttribute('aria-label', l.hide); x.title = l.hide;
      dbtn.innerHTML = '<span aria-hidden="true">' + o.icon + '</span><span>' + l.dock + '</span>';
      dbtn.title = l.dockTitle;
    }
    label();
    new MutationObserver(label).observe(root, { attributes: true, attributeFilter: ['data-lang', 'lang'] });

    function defaultPos() { wrap.style.left = o.side === 'right' ? 'auto' : '16px'; wrap.style.right = o.side === 'right' ? '16px' : 'auto'; wrap.style.top = 'auto'; wrap.style.bottom = '16px'; }
    function clampPos() {
      if (S.x == null) { defaultPos(); return; }
      var w = wrap.offsetWidth || 48, h = wrap.offsetHeight || 48;
      var px = Math.min(Math.max(8, S.x * innerWidth - w / 2), innerWidth - w - 8);
      var py = Math.min(Math.max(8, S.y * innerHeight - h / 2), innerHeight - h - 8);
      wrap.style.left = px + 'px'; wrap.style.top = py + 'px'; wrap.style.right = 'auto'; wrap.style.bottom = 'auto';
    }
    function setHidden(h) {
      S.hidden = h; save(o.key, S);
      wrap.hidden = h; wrap.style.display = h ? 'none' : '';
      if (h) { getDock().appendChild(dbtn); } else if (dbtn.parentNode) dbtn.parentNode.removeChild(dbtn);
    }
    setHidden(!!S.hidden); clampPos();
    addEventListener('resize', clampPos);

    x.addEventListener('click', function (e) { e.stopPropagation(); if (o.onClose) o.onClose(); setHidden(true); dbtn.focus(); });
    dbtn.addEventListener('click', function () { o.onOpen(dbtn); });

    /* glisser-déposer (souris et tactile) ; un petit déplacement reste un clic */
    var drag = null, moved = false;
    o.fab.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var r = wrap.getBoundingClientRect();
      drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top }; moved = false;
    });
    addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 8) return;
      if (!moved) { moved = true; wrap.classList.add('fk-drag'); try { o.fab.setPointerCapture(drag.id); } catch (_) {} }
      e.preventDefault();
      var w = wrap.offsetWidth, h = wrap.offsetHeight;
      var nx = Math.min(Math.max(8, drag.ox + dx), innerWidth - w - 8), ny = Math.min(Math.max(8, drag.oy + dy), innerHeight - h - 8);
      wrap.style.left = nx + 'px'; wrap.style.top = ny + 'px'; wrap.style.right = 'auto'; wrap.style.bottom = 'auto';
    }, { passive: false });
    function end(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      if (moved) {
        var r = wrap.getBoundingClientRect();
        S.x = (r.left + r.width / 2) / innerWidth; S.y = (r.top + r.height / 2) / innerHeight; save(o.key, S);
        wrap.classList.remove('fk-drag');
        /* annule le clic qui suit le glisser */
        var stop = function (ev) { ev.stopImmediatePropagation(); ev.preventDefault(); o.fab.removeEventListener('click', stop, true); };
        o.fab.addEventListener('click', stop, true);
        setTimeout(function () { o.fab.removeEventListener('click', stop, true); }, 400);
        setTimeout(function () { moved = false; }, 0);
      }
      drag = null;
    }
    addEventListener('pointerup', end); addEventListener('pointercancel', end);

    return { wrap: wrap, dockBtn: dbtn, isHidden: function () { return !!S.hidden; }, show: function () { setHidden(false); clampPos(); }, resetPos: function () { delete S.x; delete S.y; save(o.key, S); defaultPos(); }, moved: function () { return S.x != null; } };
  }

  window.FloatKit = { make: make, placeNear: placeNear };
})();
