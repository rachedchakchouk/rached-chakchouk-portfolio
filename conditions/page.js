(function () {
  var r = document.documentElement;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var t = get('theme'); if (t === 'dark' || t === 'light') r.setAttribute('data-theme', t);
  var lb = document.getElementById('langBtn');
  function applyLang(l) {
    r.setAttribute('data-lang', l); r.setAttribute('lang', l);
    lb.textContent = l === 'en' ? 'FR' : 'EN';
    lb.setAttribute('aria-label', l === 'en' ? 'Passer en français' : 'Switch to English');
    document.title = l === 'en' ? 'Legal notice and terms of use · Rached Chakchouk' : "Mentions légales et conditions d'utilisation · Rached Chakchouk";
  }
  var q = (location.search.match(/[?&]lang=(en|fr)\b/) || [])[1];
  var h = (location.hash.match(/^#(en|fr)-/) || [])[1];
  applyLang(h || q || get('lang') || 'fr');
  lb.addEventListener('click', function () { var l = r.getAttribute('data-lang') === 'en' ? 'fr' : 'en'; applyLang(l); set('lang', l); });
  document.getElementById('themeBtn').addEventListener('click', function () {
    var c = r.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var n = c === 'dark' ? 'light' : 'dark'; r.setAttribute('data-theme', n); set('theme', n);
  });
})();
