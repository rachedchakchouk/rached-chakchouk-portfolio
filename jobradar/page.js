(function () {
  'use strict';
  var root = document.documentElement;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var q = (location.search.match(/[?&]lang=(en|fr)\b/) || [])[1];
  function lang(l) {
    root.setAttribute('data-lang', l); root.setAttribute('lang', l);
    document.title = l === 'en' ? 'JobRadar – AI-powered job watch (Java, Spring Boot, Angular) · Rached Chakchouk'
      : 'JobRadar – veille d’offres d’emploi avec IA (Java, Spring Boot, Angular) · Rached Chakchouk';
    document.querySelectorAll('[data-lang-btn]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang-btn') === l)); });
  }
  lang(q || get('lang') || 'fr');
  document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
    b.addEventListener('click', function () { var l = b.getAttribute('data-lang-btn'); lang(l); set('lang', l); });
  });
  var t = get('theme'); if (t === 'dark' || t === 'light') root.setAttribute('data-theme', t);
  var tb = document.getElementById('themeBtn');
  if (tb) tb.addEventListener('click', function () {
    var c = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var n = c === 'dark' ? 'light' : 'dark'; root.setAttribute('data-theme', n); set('theme', n);
  });
})();
