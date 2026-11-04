// Page /github/ : statistiques GitHub (via /api/github-stats, calculées côté serveur et mises en cache 1 h).
(function () {
  var r = document.documentElement;
  function g(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function s(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var t = g('theme'); if (t === 'dark' || t === 'light') r.setAttribute('data-theme', t);
  document.getElementById('themeBtn').addEventListener('click', function () {
    var c = r.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var n = c === 'dark' ? 'light' : 'dark'; r.setAttribute('data-theme', n); s('theme', n);
  });
  var q = new URLSearchParams(location.search).get('lang');
  var lang = q === 'en' || q === 'fr' ? q : g('lang') || 'fr';
  var langBtn = document.getElementById('langBtn');
  var data = null;
  function applyLang(l) {
    lang = l; r.setAttribute('data-lang', l); r.setAttribute('lang', l); langBtn.textContent = l === 'en' ? 'FR' : 'EN';
    langBtn.setAttribute('aria-label', l === 'en' ? 'Passer en français' : 'Switch to English');
    document.title = l === 'en' ? 'GitHub activity – Rached Chakchouk' : 'Activité GitHub – Rached Chakchouk';
    if (data) render(data);
  }
  langBtn.addEventListener('click', function () { var n = lang === 'en' ? 'fr' : 'en'; s('lang', n); applyLang(n); });
  applyLang(lang);

  function T(fr, en) { return lang === 'en' ? en : fr; }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(n) { return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'fr-FR').format(n || 0); }
  function day(iso) { return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)); }
  function ago(iso) {
    var d = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d <= 0) return T("aujourd'hui", 'today'); if (d === 1) return T('hier', 'yesterday');
    return lang === 'en' ? d + ' days ago' : 'il y a ' + d + ' j';
  }
  function kpi(l, v, sub) { return '<div class="kpi"><span class="l">' + l + '</span><span class="v">' + v + '</span>' + (sub ? '<span class="s">' + sub + '</span>' : '') + '</div>'; }

  function levels(max) { return function (n) { if (!n) return 0; var q = n / Math.max(1, max); return q > 0.75 ? 4 : q > 0.5 ? 3 : q > 0.25 ? 2 : 1; }; }
  var SHADES = ['var(--l0)', 'color-mix(in srgb, var(--accent-2) 30%, var(--l0))', 'color-mix(in srgb, var(--accent-2) 55%, var(--l0))', 'color-mix(in srgb, var(--accent-2) 78%, var(--l0))', 'var(--accent-2)'];

  function calendar(weeks) {
    var max = 0; weeks.forEach(function (w) { w.forEach(function (d) { max = Math.max(max, d[1]); }); });
    var lv = levels(max), c = 13, out = '';
    weeks.forEach(function (w, x) {
      w.forEach(function (d) {
        var y = new Date(d[0] + 'T12:00:00Z').getUTCDay();
        out += '<rect x="' + (30 + x * c) + '" y="' + (16 + y * c) + '" width="11" height="11" style="fill:' + SHADES[lv(d[1])] + '"><title>' + esc(day(d[0])) + ' : ' + d[1] + '</title></rect>';
      });
    });
    var labels = lang === 'en' ? ['Mon', 'Wed', 'Fri'] : ['Lun', 'Mer', 'Ven'];
    [1, 3, 5].forEach(function (y, i) { out += '<text x="0" y="' + (26 + y * c) + '" font-size="9" fill="var(--muted)">' + labels[i] + '</text>'; });
    var w = 30 + weeks.length * c;
    return '<div class="cal"><svg viewBox="0 0 ' + w + ' 110" role="img" aria-label="' + T('Calendrier des contributions', 'Contribution calendar') + '">' + out + '</svg></div>' +
      '<div class="legend">' + T('Moins', 'Less') + SHADES.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + T('Plus', 'More') + '</div>';
  }

  function timeline(days) {
    var max = Math.max(1, Math.max.apply(null, days.map(function (d) { return d.commits; })));
    var w = 1000 / days.length, out = '<line x1="0" x2="1000" y1="150" y2="150" stroke="var(--line)"/>';
    days.forEach(function (d, i) {
      var h = (d.commits / max) * 140;
      out += '<rect x="' + (i * w + 1) + '" y="' + (150 - h) + '" width="' + Math.max(1, w - 2) + '" height="' + h + '" style="fill:var(--accent)" rx="1"><title>' + esc(day(d.day)) + ' : ' + d.commits + ' commit(s), ' + d.pushes + ' push</title></rect>';
    });
    [0, Math.floor(days.length / 2), days.length - 1].forEach(function (i, k) {
      out += '<text x="' + (k === 2 ? 1000 : i * w) + '" y="166" font-size="11" fill="var(--muted)" text-anchor="' + (k === 2 ? 'end' : k === 1 ? 'middle' : 'start') + '">' + esc(day(days[i].day)) + '</text>';
    });
    return '<div class="bars"><svg viewBox="0 0 1000 170" preserveAspectRatio="none" role="img" aria-label="' + T('Commits poussés par jour', 'Commits pushed per day') + '">' + out + '</svg></div>';
  }

  function render(d) {
    var k = d.kpis, y = d.year, h = '';
    h += '<section class="kpis">';
    if (y) {
      h += kpi(T('Contributions (12 mois)', 'Contributions (12 months)'), num(y.contributions), y.privateContributions ? num(y.privateContributions) + T(' dans des dépôts privés', ' in private repositories') : '');
      h += kpi(T('Commits (12 mois)', 'Commits (12 months)'), num(y.commits), num(y.repos) + T(' dépôts', ' repositories'));
      h += kpi(T('Pull requests (12 mois)', 'Pull requests (12 months)'), num(y.pullRequests), num(y.reviews) + T(' revues', ' reviews'));
    }
    h += kpi(T('Commits poussés (90 j)', 'Commits pushed (90 d)'), num(k.commits90), num(k.pushes90) + ' push');
    h += kpi(T('Jours actifs (90 j)', 'Active days (90 d)'), num(k.activeDays90), num(k.reposPushed30) + T(' dépôts mis à jour ce mois-ci', ' repositories updated this month'));
    h += kpi(T('Dépôts publics', 'Public repositories'), num(k.publicRepos), num(k.reposCreated90) + T(' créés en 90 j', ' created in 90 d'));
    h += kpi(T('Étoiles', 'Stars'), num(k.stars), num(k.forks) + ' forks · ' + num(k.followers) + T(' abonnés', ' followers'));
    h += '</section>';
    if (d.calendar) h += '<section class="panel"><h2>' + T('Contributions des 12 derniers mois', 'Contributions over the last 12 months') + '</h2>' + calendar(d.calendar) + '</section>';
    h += '<section class="panel"><h2>' + T('Commits poussés par jour (90 jours)', 'Commits pushed per day (90 days)') + '</h2>' + timeline(d.timeline) + '</section>';
    h += '<div class="grid2"><section class="panel"><h2>' + T('Dépôts récents', 'Recent repositories') + '</h2>';
    d.repos.forEach(function (p) {
      h += '<div class="repo"><div><a href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer">' + esc(p.name) + ' ↗</a>' + (p.language ? '<span class="chip">' + esc(p.language) + '</span>' : '') +
        (p.description ? '<div class="d">' + esc(p.description) + '</div>' : '') + '</div><div class="r">' + ago(p.pushedAt) + (p.pushes90 ? '<br>' + p.pushes90 + ' push / 90 j' : '') + (p.stars ? '<br>★ ' + p.stars : '') + '</div></div>';
    });
    if (!d.repos.length) h += '<p class="note">' + T('Aucun dépôt public.', 'No public repository.') + '</p>';
    h += '</section><section class="panel"><h2>' + T('Langages', 'Languages') + '</h2>';
    d.languages.forEach(function (l) {
      h += '<div class="lang"><div class="row"><span>' + esc(l.name) + '</span><span class="meta">' + String(l.share).replace('.', lang === 'en' ? '.' : ',') + ' %</span></div><div class="bar"><i style="width:' + l.share + '%"></i></div></div>';
    });
    h += '<p class="note">' + T('Part du code des 15 dépôts publics les plus récents. Les projets professionnels (Axeane, TraDigi) sont privés et n’apparaissent pas ici.', 'Share of code in the 15 most recent public repositories. Professional projects (Axeane, TraDigi) are private and not shown here.') + '</p></section></div>';
    document.getElementById('app').innerHTML = h;
    document.getElementById('meta').textContent = T('Mis à jour le ', 'Updated ') + new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d.generatedAt)) + ' · github.com/' + d.user;
  }

  fetch('/api/github-stats').then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); }).then(function (d) { data = d; render(d); }).catch(function () {
    document.getElementById('app').innerHTML = '<div class="state">' + T('Statistiques GitHub momentanément indisponibles. ', 'GitHub statistics temporarily unavailable. ') +
      '<a class="back" href="https://github.com/rachedchakchouk" target="_blank" rel="noopener noreferrer">github.com/rachedchakchouk ↗</a></div>';
  });
})();
