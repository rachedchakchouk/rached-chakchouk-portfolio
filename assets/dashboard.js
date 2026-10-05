(function () {
  var root = document.documentElement;
  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} }
  function lset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  var t = lget('theme'); if (t === 'dark' || t === 'light') root.setAttribute('data-theme', t);
  document.getElementById('themeBtn').addEventListener('click', function () {
    var cur = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var n = cur === 'dark' ? 'light' : 'dark'; root.setAttribute('data-theme', n); lset('theme', n); if (last) render(last);
  });

  var LABELS = { cv_download: 'Téléchargement du CV', cv_view: 'Lecture du CV en ligne', linkedin: 'Clic LinkedIn', github: 'Clic GitHub',
    project_open: 'Projet ouvert', contact_submit: 'Formulaire de contact', email_copy: 'E-mail copié', phone_copy: 'Téléphone copié' };
  var PROJ = { novia: 'Axeane Novia', tds: 'TDS-ERP RH & Paie', pfe: 'Réseau social RH', stock: 'Gestion de stock', timesheet: 'Timesheet DevOps', analytics: 'Portfolio Analytics' };
  // session token (the password is never stored; tokens expire after 2 h)
  function loadTok() { try { var t = JSON.parse(sget('rc_tok') || 'null'); return t && t.exp > Date.now() + 30000 ? t : null; } catch (e) { return null; } }
  var tok = loadTok(), days = 30, pw = tok ? tok.token : null, demo = false, last = null, expTimer = null;
  function armExpiry(exp) { clearTimeout(expTimer); expTimer = setTimeout(function () { pw = null; sset('rc_tok', null); showLogin('Session expirée (2 h) : reconnectez-vous.'); }, Math.max(0, exp - Date.now())); }
  if (tok) armExpiry(tok.exp);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function flag(cc) { return cc && /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint.apply(null, cc.split('').map(function (c) { return 127397 + c.charCodeAt(0); })) + ' ' : ''; }
  function fmt(n) { return Number(n || 0).toLocaleString('fr-FR'); }

  function showApp() { document.getElementById('login').hidden = true; document.getElementById('app').hidden = false; document.getElementById('demoBar').hidden = !demo; lset('rc_ignore', '1'); load(); }
  function showLogin(msg) { document.getElementById('app').hidden = true; document.getElementById('login').hidden = false; document.getElementById('loginErr').textContent = msg || ''; document.getElementById('loginInfo').textContent = ''; document.getElementById('pwModal').hidden = true; document.getElementById('pw').focus(); }

  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault(); var v = document.getElementById('pw').value;
    if (!v) { document.getElementById('loginErr').textContent = 'Saisissez votre mot de passe.'; return; }
    var btn = this.querySelector('button[type=submit]'); btn.disabled = true;
    fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: v }), cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; }); })
      .then(function (x) {
        document.getElementById('pw').value = '';
        if (x.r.status === 429) return showLogin('Trop de tentatives : réessayez dans ' + Math.ceil((x.j.retryAfter || 900) / 60) + ' min.');
        if (x.r.status === 503) return showLogin('Le dashboard n’est pas configuré (DASHBOARD_PASSWORD manquant dans Netlify).');
        if (!x.r.ok || !x.j.token) return showLogin('Mot de passe incorrect.' + (x.j.remaining != null ? ' Tentatives restantes : ' + x.j.remaining + '.' : ''));
        pw = x.j.token; demo = false; sset('rc_tok', JSON.stringify(x.j)); armExpiry(x.j.exp);
        if (x.j.mustChange) return openPw(true);
        showApp();
      })
      .catch(function () { showLogin('Impossible de joindre le serveur. Réessayez.'); })
      .then(function () { btn.disabled = false; });
  });

  // ---- mot de passe oublié : un mot de passe provisoire (15 min, usage unique) est envoyé par e-mail ----
  document.getElementById('forgotBtn').addEventListener('click', function () {
    var b = this, err = document.getElementById('loginErr'), info = document.getElementById('loginInfo');
    b.disabled = true; err.textContent = ''; info.textContent = 'Envoi en cours…';
    fetch('/api/admin/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; }); })
      .then(function (x) {
        info.textContent = '';
        if (x.r.ok) { info.textContent = 'Un mot de passe provisoire a été envoyé à ' + (x.j.to || 'votre adresse') + '. Il est valable ' + (x.j.validMinutes || 15) + ' min et ne sert qu’une fois.'; return; }
        if (x.r.status === 429) { err.textContent = 'Trop de demandes : réessayez dans ' + Math.ceil((x.j.retryAfter || 3600) / 60) + ' min.'; return; }
        if (x.j.error === 'mail_not_configured') { err.textContent = 'L’envoi d’e-mails n’est pas configuré (RESEND_API_KEY manquant dans Netlify).'; return; }
        err.textContent = 'L’e-mail n’a pas pu être envoyé. Réessayez plus tard.';
      })
      .catch(function () { info.textContent = ''; err.textContent = 'Impossible de joindre le serveur. Réessayez.'; })
      .then(function () { b.disabled = false; });
  });

  // ---- changement du mot de passe ----
  var forced = false;
  var PW_ERR = { too_short: 'Le nouveau mot de passe doit faire au moins 10 caractères.', too_long: 'Mot de passe trop long.',
    too_simple: 'Utilisez au moins 3 types : minuscules, majuscules, chiffres, symboles.', same_as_before: 'Choisissez un mot de passe différent de l’actuel.',
    wrong_current: 'Mot de passe actuel incorrect.', locked: 'Trop de tentatives : réessayez dans 15 min.' };
  function openPw(isForced) {
    forced = !!isForced;
    document.getElementById('pwCurL').hidden = forced;
    document.getElementById('pwCancel').hidden = forced;
    document.getElementById('pwIntro').textContent = (forced ? 'Vous êtes connecté avec le mot de passe provisoire : choisissez votre nouveau mot de passe. ' : '') +
      'Au moins 10 caractères, avec 3 types parmi : minuscules, majuscules, chiffres, symboles.';
    ['pwCur', 'pwNew', 'pwNew2'].forEach(function (id) { document.getElementById(id).value = ''; });
    document.getElementById('pwErr').textContent = '';
    if (forced) { document.getElementById('login').hidden = true; document.getElementById('app').hidden = true; }
    document.getElementById('pwModal').hidden = false;
    document.getElementById(forced ? 'pwNew' : 'pwCur').focus();
  }
  function closePw() { document.getElementById('pwModal').hidden = true; ['pwCur', 'pwNew', 'pwNew2'].forEach(function (id) { document.getElementById(id).value = ''; }); }
  document.getElementById('pwBtn').addEventListener('click', function () {
    if (demo) { toast('Connectez-vous avec votre mot de passe pour le modifier.'); return; }
    openPw(false);
  });
  document.getElementById('pwCancel').addEventListener('click', closePw);
  document.getElementById('pwModal').addEventListener('keydown', function (e) { if (e.key === 'Escape' && !forced) closePw(); });
  document.getElementById('pwForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var cur = document.getElementById('pwCur').value, n1 = document.getElementById('pwNew').value, n2 = document.getElementById('pwNew2').value, er = document.getElementById('pwErr');
    if (!forced && !cur) { er.textContent = 'Saisissez votre mot de passe actuel.'; return; }
    if (n1 !== n2) { er.textContent = 'Les deux nouveaux mots de passe ne correspondent pas.'; return; }
    if (n1.length < 10) { er.textContent = PW_ERR.too_short; return; }
    var btn = this.querySelector('button[type=submit]'); btn.disabled = true; er.textContent = '';
    fetch('/api/admin/password', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + pw }, body: JSON.stringify({ current: forced ? undefined : cur, next: n1 }), cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; }); })
      .then(function (x) {
        if (x.r.status === 401) { sset('rc_tok', null); pw = null; return showLogin('Session expirée : reconnectez-vous.'); }
        if (!x.r.ok || !x.j.token) { er.textContent = PW_ERR[x.j.error] || 'Le mot de passe n’a pas pu être changé.'; return; }
        pw = x.j.token; sset('rc_tok', JSON.stringify(x.j)); armExpiry(x.j.exp);
        closePw(); var wasForced = forced; forced = false;
        if (wasForced) showApp();
        toast('Mot de passe changé. Les autres sessions ont été déconnectées.');
      })
      .catch(function () { er.textContent = 'Impossible de joindre le serveur. Réessayez.'; })
      .then(function () { btn.disabled = false; });
  });
  document.getElementById('demoBtn').addEventListener('click', function () { demo = true; showApp(); });
  document.getElementById('logout').addEventListener('click', function () { pw = null; demo = false; sset('rc_tok', null); clearTimeout(expTimer); last = null; work = null; saved = null; setDirty(false); document.querySelector('.tabs button[data-tab="stats"]').click(); showLogin(); });
  document.getElementById('refresh').addEventListener('click', load);
  document.querySelectorAll('.seg button').forEach(function (b) {
    b.addEventListener('click', function () {
      days = +b.getAttribute('data-days');
      document.querySelectorAll('.seg button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      load();
    });
  });

  function setState(msg) { var s = document.getElementById('state'); s.textContent = msg; s.hidden = !msg; document.getElementById('content').hidden = !!msg; }

  function load() {
    if (demo) { last = demoData(days); render(last); return; }
    setState('Chargement…');
    fetch('/api/stats?days=' + days, { headers: { Authorization: 'Bearer ' + pw }, cache: 'no-store' })
      .then(function (r) {
        if (r.status === 401) { sset('rc_tok', null); throw { login: 'Session expirée : reconnectez-vous.' }; }
        if (r.status === 503) throw { msg: 'Le dashboard n’est pas encore configuré : ajoutez la variable DASHBOARD_PASSWORD dans Netlify (Project configuration → Environment variables), puis redéployez.' };
        if (r.status === 429) throw { msg: 'Trop de requêtes. Réessayez dans une minute.' };
        if (!r.ok) throw { msg: 'Le serveur a répondu ' + r.status + '. Réessayez avec ↻.' };
        return r.json();
      })
      .then(function (d) { last = d; render(d); })
      .catch(function (e) {
        if (e && e.login) return showLogin(e.login);
        setState(e && e.msg ? e.msg : 'Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez avec ↻.');
      });
  }

  function bars(id, items, labeler) {
    var el = document.getElementById(id);
    if (!items || !items.length) { el.innerHTML = '<li class="empty">Pas encore de données.</li>'; return; }
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }));
    el.innerHTML = items.map(function (i) {
      var lab = labeler ? labeler(i.label) : i.label;
      return '<li><span class="lab" title="' + esc(lab) + '">' + esc(lab) + '</span><span class="val">' + fmt(i.value) + '</span><span class="track"><span class="fill" style="width:' + Math.max(2, i.value / max * 100) + '%"></span></span></li>';
    }).join('');
  }

  function render(d) {
    setState('');
    var t = d.totals;
    document.getElementById('kVisits').textContent = fmt(t.visits);
    document.getElementById('kVisitors').textContent = fmt(t.visitors);
    document.getElementById('kCountries').textContent = fmt(t.countries);
    document.getElementById('kActions').textContent = fmt(t.actions);
    document.getElementById('kRange').textContent = d.range.days + ' derniers jours';
    document.getElementById('chartRange').textContent = d.range.from + ' → ' + d.range.to + ' (UTC)';
    var tc = (d.countries || []).filter(function (c) { return c.label !== 'Unknown'; })[0];
    document.getElementById('kTopCountry').textContent = tc ? 'En tête : ' + tc.label : '—';
    document.getElementById('kTopAction').textContent = d.actions && d.actions[0] ? 'En tête : ' + (LABELS[d.actions[0].label] || d.actions[0].label) : '—';
    chart(d.series);
    bars('bCountries', d.countries, function (l) { return l === 'Unknown' ? 'Inconnu' : l; });
    bars('bCities', d.cities); bars('bSources', d.sources); bars('bDevices', d.devices); bars('bBrowsers', d.browsers);
    bars('bLangs', d.languages); bars('bActions', d.actions, function (l) { return LABELS[l] || l; });
    bars('bProjects', d.projects, function (l) { return PROJ[l] || l; });
    var rows = (d.recent || []).map(function (r) {
      var dt = new Date(r.ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      var place = flag(r.cc) + (r.city ? r.city + ', ' : '') + (r.country || 'Inconnu');
      return '<tr><td class="num">' + esc(dt) + '</td><td>' + esc(place) + '</td><td>' + esc(r.src) + '</td><td>' + esc(r.device) + '</td><td>' + esc(r.browser) + '</td></tr>';
    }).join('');
    document.getElementById('recent').innerHTML = rows || '<tr><td colspan="5" class="empty">Pas encore de visite enregistrée.</td></tr>';
  }

  function chart(series) {
    var box = document.getElementById('chart');
    var W = Math.max(320, box.clientWidth || 800), H = 240, L = 36, R = 44, T = 14, B = 28;
    var n = series.length, max = Math.max(1, Math.max.apply(null, series.map(function (s) { return s.visits; })));
    var step = Math.pow(10, Math.floor(Math.log10(max))), nice = Math.ceil(max / step) * step; if (nice / step > 5) step *= 2; nice = Math.ceil(max / step) * step;
    var x = function (i) { return L + (n === 1 ? 0 : i * (W - L - R) / (n - 1)); }, y = function (v) { return T + (H - T - B) * (1 - v / nice); };
    var g = '';
    for (var v = 0; v <= nice; v += step) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--grid)"/><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '</text>';
    var every = Math.ceil(n / 7);
    series.forEach(function (s, i) { if (i % every === 0 || i === n - 1) g += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + s.date.slice(8) + '/' + s.date.slice(5, 7) + '</text>'; });
    var line = function (k) { return series.map(function (s, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(s[k]).toFixed(1); }).join(' '); };
    var area = line('visits') + ' L' + x(n - 1) + ' ' + y(0) + ' L' + x(0) + ' ' + y(0) + ' Z';
    var lastS = series[n - 1];
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Visites et visiteurs uniques par jour">' + g +
      '<path d="' + area + '" fill="var(--s1)" fill-opacity=".10"/>' +
      '<path d="' + line('visits') + '" fill="none" stroke="var(--s1)" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="' + line('visitors') + '" fill="none" stroke="var(--s2)" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round"/>' +
      '<circle cx="' + x(n - 1) + '" cy="' + y(lastS.visits) + '" r="4" fill="var(--s1)" stroke="var(--surface)" stroke-width="2"/>' +
      '<text x="' + (x(n - 1) + 8) + '" y="' + (y(lastS.visits) + 4) + '" style="fill:var(--fg)">' + lastS.visits + '</text>' +
      '<line id="xh" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--muted)" stroke-dasharray="3 3" visibility="hidden"/>' +
      '<rect x="' + L + '" y="' + T + '" width="' + (W - L - R) + '" height="' + (H - T - B) + '" fill="transparent" id="hit"/></svg><div class="tip" id="tip" hidden></div>';
    box.innerHTML = svg;
    var svgEl = box.querySelector('svg'), tip = box.querySelector('#tip'), xh = box.querySelector('#xh');
    function move(ev) {
      var rect = svgEl.getBoundingClientRect(), px = (ev.clientX - rect.left) * W / rect.width;
      var i = Math.round((px - L) / ((W - L - R) / Math.max(1, n - 1))); i = Math.max(0, Math.min(n - 1, i));
      var s = series[i]; xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.setAttribute('visibility', 'visible');
      tip.hidden = false; tip.style.left = (x(i) * rect.width / W) + 'px'; tip.style.top = (y(s.visits) * rect.height / H) + 'px';
      tip.innerHTML = s.date + '<br>Visites <b>' + s.visits + '</b> · Uniques <b>' + s.visitors + '</b>';
    }
    box.querySelector('#hit').addEventListener('pointermove', move);
    box.querySelector('#hit').addEventListener('pointerleave', function () { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); });
  }
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (last) chart(last.series); }, 150); });

  // Clearly labelled fictitious data for the demo button only.
  function demoData(nd) {
    var series = [], now = Date.now(), seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = nd - 1; i >= 0; i--) { var v = Math.round(6 + rnd() * 18 + (i < 5 ? 10 : 0)); series.push({ date: new Date(now - i * 864e5).toISOString().slice(0, 10), visits: v, visitors: Math.round(v * .7) }); }
    var vis = series.reduce(function (a, s) { return a + s.visits; }, 0);
    return { range: { days: nd, from: series[0].date, to: series[nd - 1].date },
      totals: { visits: vis, visitors: Math.round(vis * .68), countries: 5, actions: Math.round(vis * .4) }, series: series,
      countries: [{ label: 'Tunisia', value: 120 }, { label: 'France', value: 64 }, { label: 'Luxembourg', value: 22 }, { label: 'Germany', value: 9 }, { label: 'Canada', value: 6 }],
      cities: [{ label: 'Tunis, TN', value: 70 }, { label: 'Paris, FR', value: 31 }, { label: 'Ariana, TN', value: 25 }, { label: 'Luxembourg, LU', value: 20 }],
      sources: [{ label: 'LinkedIn', value: 98 }, { label: 'Direct', value: 61 }, { label: 'Google', value: 30 }, { label: 'GitHub', value: 14 }],
      devices: [{ label: 'Mobile', value: 118 }, { label: 'Desktop', value: 95 }, { label: 'Tablet', value: 8 }],
      browsers: [{ label: 'Chrome', value: 140 }, { label: 'Safari', value: 44 }, { label: 'Edge', value: 22 }, { label: 'Firefox', value: 15 }],
      languages: [{ label: 'fr', value: 150 }, { label: 'en', value: 71 }],
      actions: [{ label: 'cv_download', value: 41 }, { label: 'linkedin', value: 33 }, { label: 'project_open', value: 29 }, { label: 'cv_view', value: 18 }, { label: 'github', value: 12 }, { label: 'contact_submit', value: 3 }],
      projects: [{ label: 'novia', value: 14 }, { label: 'tds', value: 7 }, { label: 'analytics', value: 5 }, { label: 'pfe', value: 3 }],
      recent: [{ ts: now - 6e5, cc: 'FR', city: 'Paris', country: 'France', src: 'LinkedIn', device: 'Desktop', browser: 'Chrome' },
        { ts: now - 36e5, cc: 'TN', city: 'Tunis', country: 'Tunisia', src: 'Direct', device: 'Mobile', browser: 'Chrome' },
        { ts: now - 9e6, cc: 'LU', city: 'Luxembourg', country: 'Luxembourg', src: 'Google', device: 'Mobile', browser: 'Safari' }] };
  }

  // ================= Tabs =================
  var curTab = 'stats';
  function toast(msg) { var t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 3200); }
  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      var tab = b.getAttribute('data-tab');
      if (demo && tab !== 'stats') { toast('Connectez-vous avec votre mot de passe pour modifier le contenu.'); return; }
      curTab = tab;
      document.querySelectorAll('.tabs button').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      document.getElementById('main').hidden = tab !== 'stats';
      document.getElementById('tabContent').hidden = tab !== 'content';
      document.getElementById('tabFiles').hidden = tab !== 'files';
      document.querySelector('.seg[aria-label="Période"]').style.visibility = tab === 'stats' ? '' : 'hidden';
      if (tab === 'content' && !work) loadContent();
      if (tab === 'files') loadFiles();
    });
  });

  function api(method, url, body, headers) {
    var h = Object.assign({ Authorization: 'Bearer ' + pw }, headers || {});
    return fetch(url, { method: method, headers: h, body: body, cache: 'no-store' }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401) { sset('rc_tok', null); pw = null; showLogin('Session expirée : reconnectez-vous.'); throw new Error('auth'); }
        if (r.status === 503) throw new Error('Ajoutez la variable DASHBOARD_PASSWORD dans Netlify, puis redéployez.');
        if (!r.ok) throw new Error(ERRS[j.error] || ('Erreur ' + r.status));
        return j;
      });
    });
  }
  var ERRS = { too_large: 'Fichier trop lourd.', not_pdf: 'Ce fichier n’est pas un PDF valide.', not_image: 'Ce fichier n’est pas une image JPG, PNG ou WebP.', empty: 'Fichier vide.', unknown_slot: 'Nom de fichier non autorisé.', invalid_content: 'Contenu invalide : vérifiez les champs.', bad_json: 'Contenu illisible.' };
  function fail(e) { if (e && e.message !== 'auth') toast(e.message || 'Une erreur est survenue.'); }

  // ================= Content editor =================
  var B2 = function (o) { return o && (o.fr || o.en) || ''; };
  var STAT = function (i) { return [['stats.' + i + '.value', 'number', 'Chiffre ' + (i + 1)], ['stats.' + i + '.unit', 'bi', 'Unité ' + (i + 1) + ' (ex. ans)'], ['stats.' + i + '.label', 'bi', 'Libellé ' + (i + 1)]]; };
  var JOB = { fields: [['role', 'bi', 'Poste'], ['company', 'text', 'Entreprise'], ['url', 'url', 'Site de l’entreprise'], ['logoText', 'text', 'Logo (initiales)'], ['logoImg', 'url', 'Logo (image, ex. /media/img-logo)'], ['when', 'bi', 'Période'], ['current', 'bool', 'Poste actuel'], ['context', 'bi', 'Contexte / produit'], ['items', 'bilist', 'Réalisations (une par ligne, **gras** possible)'], ['stack', 'list', 'Technologies (séparées par des virgules)']],
    label: function (x) { return B2(x.role) + (x.company ? ' – ' + x.company : ''); },
    blank: function () { return { role: { fr: 'Nouveau poste', en: 'New role' }, company: '', url: '', logoText: '', logoImg: '', when: { fr: '', en: '' }, current: false, context: { fr: '', en: '' }, items: { fr: [], en: [] }, stack: [] }; } };
  var SCHEMAS = {
    profile: { title: 'Profil', single: true, fields: [['lead', 'bitext', 'Présentation (**gras** possible)'], ['now.role', 'bi', '« Actuellement » – intitulé'], ['now.company', 'text', 'Entreprise actuelle'], ['now.desc', 'bi', 'Description du poste actuel']].concat(STAT(0), STAT(1), STAT(2)) },
    experiences: Object.assign({ title: 'Expériences' }, JOB),
    internships: Object.assign({ title: 'Stages' }, JOB),
    projects: { title: 'Projets', fields: [['title', 'bi', 'Titre'], ['id', 'text', 'Identifiant (minuscules, chiffres, tirets)'], ['kind', 'bi', 'Type (ex. ERP SaaS · Facturation)'], ['org.name', 'text', 'Entreprise / cadre'], ['org.url', 'url', 'Lien entreprise'], ['org.when', 'bi', 'Période'], ['desc', 'bitext', 'Résumé (carte)'], ['problem', 'bitext', 'Problème'], ['role', 'bitext', 'Mon rôle'], ['items', 'bilist', 'Réalisations (une par ligne)'], ['stack', 'list', 'Stack (séparée par des virgules)'], ['cats', 'cats', 'Filtres'], ['feat', 'bool', 'Grande carte'], ['mono', 'text', 'Texte de couverture (si pas de capture)'], ['shots', 'lines', 'Captures d’écran (une adresse par ligne, ex. /media/img-novia-1)'], ['links', 'links', 'Liens (« Libellé | adresse » par ligne)']],
      label: function (x) { return B2(x.title) || x.id; },
      blank: function () { return { id: 'projet-' + Date.now().toString(36), feat: false, cats: ['fullstack'], mono: 'Projet', shots: [], kind: { fr: '', en: '' }, title: { fr: 'Nouveau projet', en: 'New project' }, org: { name: '', url: '', when: { fr: '', en: '' } }, desc: { fr: '', en: '' }, problem: { fr: '', en: '' }, role: { fr: '', en: '' }, items: { fr: [], en: [] }, stack: [], links: [] }; } },
    skills: { title: 'Compétences', fields: [['title', 'bi', 'Catégorie'], ['items', 'skills', 'Compétences (une par ligne · « * » devant = mise en avant · « fr: » / « en: » = une seule langue)']],
      label: function (x) { return B2(x.title); }, blank: function () { return { title: { fr: 'Nouvelle catégorie', en: 'New category' }, items: [] }; } },
    education: { title: 'Formation', fields: [['title', 'bi', 'Diplôme'], ['school', 'bi', 'Établissement'], ['url', 'url', 'Site'], ['years', 'text', 'Années'], ['logoText', 'text', 'Logo (initiales)']],
      label: function (x) { return B2(x.title); }, blank: function () { return { title: { fr: 'Nouveau diplôme', en: 'New degree' }, school: { fr: '', en: '' }, url: '', years: '', logoText: '' }; } },
    languages: { title: 'Langues', fields: [['name', 'bi', 'Langue'], ['level', 'bi', 'Niveau']],
      label: function (x) { return B2(x.name); }, blank: function () { return { name: { fr: 'Langue', en: 'Language' }, level: { fr: '', en: '' } }; } }
  };
  var work = null, saved = null, col = 'experiences', sel = 0, dirty = false;
  var seg = document.getElementById('colSeg');
  seg.innerHTML = Object.keys(SCHEMAS).map(function (k) { return '<button type="button" data-col="' + k + '" aria-pressed="' + (k === col) + '">' + SCHEMAS[k].title + '</button>'; }).join('');
  seg.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; col = b.getAttribute('data-col'); sel = 0; seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); renderEditor(); });

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function getP(o, path) { return path.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
  function setP(o, path, v) { var ks = path.split('.'), last = ks.pop(); ks.forEach(function (k, i) { if (o[k] == null) o[k] = /^\d+$/.test(ks[i + 1] || last) ? [] : {}; o = o[k]; }); o[last] = v; }
  function setDirty(d) { dirty = d; document.getElementById('dirty').hidden = !d; }
  addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  function loadContent() {
    document.getElementById('edNote').textContent = 'Chargement…';
    api('GET', '/api/admin/content').then(function (j) {
      if (j.content) return { c: j.content, src: 'Contenu publié depuis le dashboard' + (j.updated ? ' le ' + new Date(j.updated).toLocaleString('fr-FR') : '') + '.' };
      return fetch('/content.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (c) { return { c: c, src: 'Contenu d’origine du site (aucune modification publiée).' }; });
    }).then(function (x) { work = clone(x.c); saved = clone(x.c); setDirty(false); document.getElementById('edNote').textContent = x.src + ' Les changements apparaissent sur le site dès que vous cliquez « Publier ».'; renderEditor(); })
      .catch(function (e) { document.getElementById('edNote').textContent = ''; fail(e); });
  }

  function itemsOf() { var s = SCHEMAS[col]; return s.single ? [work.profile || (work.profile = {})] : (work[col] || (work[col] = [])); }
  function renderEditor() {
    if (!work) return;
    var s = SCHEMAS[col], list = itemsOf();
    document.getElementById('edColTitle').textContent = s.title;
    document.getElementById('edAdd').hidden = !!s.single;
    var ol = document.getElementById('edItems');
    ol.innerHTML = s.single ? '<li class="sel"><span class="it-title">Haut de page</span></li>' : list.map(function (it, i) {
      return '<li class="' + (i === sel ? 'sel' : '') + '"><button type="button" class="it-title" data-act="sel" data-i="' + i + '">' + esc(s.label(it) || '(sans titre)') + '</button>' +
        '<button type="button" class="ico-btn" data-act="up" data-i="' + i + '" aria-label="Monter"' + (i ? '' : ' disabled') + '>↑</button>' +
        '<button type="button" class="ico-btn" data-act="down" data-i="' + i + '" aria-label="Descendre"' + (i < list.length - 1 ? '' : ' disabled') + '>↓</button>' +
        '<button type="button" class="ico-btn bad" data-act="del" data-i="' + i + '" aria-label="Supprimer">✕</button></li>';
    }).join('') || '<li class="empty">Aucun élément.</li>';
    renderForm();
  }
  document.getElementById('edItems').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var i = +b.getAttribute('data-i'), list = itemsOf(), act = b.getAttribute('data-act');
    if (act === 'sel') sel = i;
    if (act === 'up' && i > 0) { list.splice(i - 1, 0, list.splice(i, 1)[0]); sel = i - 1; setDirty(true); }
    if (act === 'down' && i < list.length - 1) { list.splice(i + 1, 0, list.splice(i, 1)[0]); sel = i + 1; setDirty(true); }
    if (act === 'del') {
      if (b.getAttribute('data-confirm') !== '1') { b.setAttribute('data-confirm', '1'); b.textContent = 'OK ?'; b.style.width = 'auto'; b.style.padding = '0 8px'; setTimeout(function () { if (b.isConnected) { b.removeAttribute('data-confirm'); b.textContent = '✕'; b.style.width = ''; b.style.padding = ''; } }, 3000); return; }
      list.splice(i, 1); sel = Math.max(0, Math.min(sel, list.length - 1)); setDirty(true); toast('Élément supprimé — cliquez « Publier » pour valider.');
    }
    renderEditor();
  });
  document.getElementById('edAdd').addEventListener('click', function () { var list = itemsOf(); list.push(SCHEMAS[col].blank()); sel = list.length - 1; setDirty(true); renderEditor(); document.querySelector('#edForm input, #edForm textarea').focus(); });

  function toForm(type, v) {
    if (type === 'bilist') return { fr: (v && v.fr || []).join('\n'), en: (v && v.en || []).join('\n') };
    if (type === 'list') return (v || []).join(', ');
    if (type === 'lines') return (v || []).join('\n');
    if (type === 'links') return (v || []).map(function (l) { return (l.label || '') + ' | ' + (l.url || ''); }).join('\n');
    if (type === 'skills') return (v || []).map(function (it) { return (it.key ? '* ' : '') + (it.lang ? it.lang + ': ' : '') + it.name; }).join('\n');
    return v;
  }
  function fromForm(type, raw) {
    var lines = function (t) { return String(t || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); };
    if (type === 'list') return String(raw || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    if (type === 'lines') return lines(raw);
    if (type === 'links') return lines(raw).map(function (l) { var p = l.split('|'); return { label: (p[0] || '').trim(), url: (p.slice(1).join('|') || '').trim() }; }).filter(function (l) { return l.label && l.url; });
    if (type === 'skills') return lines(raw).map(function (l) { var it = { name: l, key: false }; if (/^\*\s*/.test(it.name)) { it.key = true; it.name = it.name.replace(/^\*\s*/, ''); } var m = it.name.match(/^(fr|en):\s*(.*)$/i); if (m) { it.lang = m[1].toLowerCase(); it.name = m[2]; } return it; });
    if (type === 'number') return Number(raw) || 0;
    return raw;
  }
  var fid = 0;
  function renderForm() {
    var form = document.getElementById('edForm'), s = SCHEMAS[col], it = itemsOf()[s.single ? 0 : sel];
    if (!it) { form.innerHTML = '<p class="empty">Sélectionnez ou ajoutez un élément.</p>'; return; }
    form.innerHTML = s.fields.map(function (f) {
      var path = f[0], type = f[1], lab = f[2], v = toForm(type, getP(it, path)), id = 'f' + (++fid);
      if (type === 'bi' || type === 'bitext' || type === 'bilist') {
        var tag = type === 'bi' ? 'input' : 'textarea'; v = v || {};
        var inp = function (lg) { var val = esc(v[lg] == null ? '' : v[lg]); return tag === 'input' ? '<input type="text" id="' + id + lg + '" data-path="' + path + '" data-type="' + type + '" data-lang="' + lg + '" value="' + val + '">' : '<textarea id="' + id + lg + '" data-path="' + path + '" data-type="' + type + '" data-lang="' + lg + '">' + val + '</textarea>'; };
        return '<div class="fld"><span>' + esc(lab) + '</span><div class="pair"><label for="' + id + 'fr">FR' + inp('fr') + '</label><label for="' + id + 'en">EN' + inp('en') + '</label></div></div>';
      }
      if (type === 'bool') return '<div class="fld chk"><label for="' + id + '"><input type="checkbox" id="' + id + '" data-path="' + path + '" data-type="bool"' + (v ? ' checked' : '') + '> ' + esc(lab) + '</label></div>';
      if (type === 'cats') return '<div class="fld"><span>' + esc(lab) + '</span><div class="chk">' + ['erp', 'fullstack', 'backend', 'devops'].map(function (c) { return '<label><input type="checkbox" data-path="' + path + '" data-type="cats" value="' + c + '"' + ((v || []).indexOf(c) > -1 ? ' checked' : '') + '> ' + ({ erp: 'ERP', fullstack: 'Full Stack', backend: 'Backend', devops: 'DevOps' })[c] + '</label>'; }).join('') + '</div></div>';
      var big = type === 'lines' || type === 'links' || type === 'skills';
      return '<div class="fld"><label for="' + id + '"><span>' + esc(lab) + '</span></label>' + (big ? '<textarea id="' + id + '" data-path="' + path + '" data-type="' + type + '">' + esc(v || '') + '</textarea>' : '<input id="' + id + '" type="' + (type === 'number' ? 'number' : type === 'url' ? 'url' : 'text') + '" data-path="' + path + '" data-type="' + type + '" value="' + esc(v == null ? '' : v) + '">') + '</div>';
    }).join('');
  }
  document.getElementById('edForm').addEventListener('input', function (e) {
    var el = e.target, path = el.getAttribute('data-path'); if (!path) return;
    var s = SCHEMAS[col], it = itemsOf()[s.single ? 0 : sel], type = el.getAttribute('data-type');
    if (type === 'bi' || type === 'bitext') { var o = getP(it, path) || {}; o[el.getAttribute('data-lang')] = el.value; setP(it, path, o); }
    else if (type === 'bilist') { var o2 = getP(it, path) || {}; o2[el.getAttribute('data-lang')] = fromForm('lines', el.value); setP(it, path, o2); }
    else if (type === 'bool') setP(it, path, el.checked);
    else if (type === 'cats') setP(it, path, [].map.call(document.querySelectorAll('#edForm [data-type="cats"]:checked'), function (c) { return c.value; }));
    else setP(it, path, fromForm(type, el.value));
    setDirty(true);
    if (!s.single) { var t = document.querySelector('#edItems li.sel .it-title'); if (t) t.textContent = s.label(it) || '(sans titre)'; }
  });
  document.getElementById('edForm').addEventListener('change', function (e) { if (e.target.type === 'checkbox') e.target.dispatchEvent(new Event('input', { bubbles: true })); });
  document.getElementById('edForm').addEventListener('submit', function (e) { e.preventDefault(); });
  document.getElementById('edUndo').addEventListener('click', function () { if (!saved) return; work = clone(saved); setDirty(false); sel = 0; renderEditor(); toast('Modifications annulées.'); });
  document.getElementById('edSave').addEventListener('click', function () {
    if (!work) return;
    var ids = (work.projects || []).map(function (p) { return p.id; });
    var bad = ids.filter(function (id, i) { return !/^[a-z0-9-]{1,40}$/.test(id || '') || ids.indexOf(id) !== i; });
    if (bad.length) { toast('Identifiant de projet invalide ou en double : « ' + bad[0] + ' ».'); return; }
    var btn = this; btn.disabled = true; btn.textContent = 'Publication…';
    api('PUT', '/api/admin/content', JSON.stringify(work), { 'Content-Type': 'application/json' })
      .then(function () { saved = clone(work); setDirty(false); toast('Publié : le site est à jour.'); document.getElementById('edNote').textContent = 'Contenu publié depuis le dashboard le ' + new Date().toLocaleString('fr-FR') + '.'; })
      .catch(fail).then(function () { btn.disabled = false; btn.textContent = 'Publier'; });
  });
  document.getElementById('edReset').addEventListener('click', function () { document.getElementById('edResetConfirm').hidden = false; });
  document.getElementById('edResetNo').addEventListener('click', function () { document.getElementById('edResetConfirm').hidden = true; });
  document.getElementById('edResetYes').addEventListener('click', function () {
    api('DELETE', '/api/admin/content').then(function () { document.getElementById('edResetConfirm').hidden = true; work = null; toast('Contenu d’origine rétabli.'); loadContent(); }).catch(fail);
  });

  // ================= Files =================
  var FIXED = { 'cv-fr.pdf': { label: 'CV français (PDF)', accept: 'application/pdf', max: 4 }, 'cv-en.pdf': { label: 'CV anglais (PDF)', accept: 'application/pdf', max: 4 }, 'photo': { label: 'Photo de profil', accept: 'image/jpeg,image/png,image/webp', max: 3 } };
  function size(n) { return n ? (n / 1024 / 1024 >= 1 ? (n / 1048576).toFixed(1) + ' Mo' : Math.round(n / 1024) + ' Ko') : ''; }
  function upload(name, file, max) {
    if (!file) return Promise.reject(new Error('Choisissez un fichier.'));
    if (file.size > max * 1048576) return Promise.reject(new Error('Fichier trop lourd (' + max + ' Mo max).'));
    return file.arrayBuffer().then(function (buf) { return api('PUT', '/api/admin/media?name=' + encodeURIComponent(name), buf, { 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': file.name.replace(/[^\w.\- ]/g, '') }); });
  }
  function loadFiles() {
    api('GET', '/api/admin/media').then(function (j) {
      var byName = {}; j.items.forEach(function (i) { byName[i.name] = i; });
      document.getElementById('fixedFiles').innerHTML = Object.keys(FIXED).map(function (n) {
        var f = FIXED[n], it = byName[n] || {}, url = '/media/' + n + '?v=' + (it.updated || 0), id = 'up-' + n.replace('.', '-');
        return '<div class="card fcard" data-name="' + n + '"><h2>' + f.label + ' <span class="pill' + (it.custom ? ' on' : '') + '">' + (it.custom ? 'Personnalisé' : 'Fichier d’origine') + '</span></h2>' +
          '<div class="prev">' + (n === 'photo' ? '<img src="' + url + '" alt="Photo actuelle">' : '<a class="pdf" href="' + url + '" target="_blank" rel="noopener">PDF ↗</a>') + '</div>' +
          '<div class="meta">' + (it.custom ? size(it.size) + ' · ' + new Date(it.updated).toLocaleString('fr-FR') + (it.original ? ' · ' + esc(it.original) : '') : 'Fichier intégré au site') + '</div>' +
          '<label class="up-field" for="' + id + '">Nouveau fichier (' + f.max + ' Mo max)<input type="file" id="' + id + '" accept="' + f.accept + '"></label>' +
          '<div class="meta sel-info"></div>' +
          '<div class="row"><button class="btn primary" type="button" data-fact="up">Publier</button>' + (it.custom ? '<button class="btn" type="button" data-fact="del">Revenir à l’original</button>' : '') + '</div></div>';
      }).join('');
      var lib = j.items.filter(function (i) { return /^img-/.test(i.name); });
      document.getElementById('imgLib').innerHTML = lib.length ? lib.map(function (i) {
        var u = '/media/' + i.name;
        return '<figure><img src="' + u + '?v=' + i.updated + '" alt="' + esc(i.name) + '" loading="lazy"><figcaption><span>' + u + '</span><span class="row"><button class="btn" type="button" data-copy-url="' + u + '">Copier l’adresse</button><button class="btn bad" type="button" data-del-img="' + i.name + '">Supprimer</button></span></figcaption></figure>';
      }).join('') : '<p class="empty">Aucune image pour l’instant.</p>';
    }).catch(fail);
  }
  document.getElementById('fixedFiles').addEventListener('change', function (e) {
    var inp = e.target; if (inp.type !== 'file') return;
    var card = inp.closest('.fcard'), file = inp.files[0], info = card.querySelector('.sel-info');
    info.textContent = file ? 'Sélectionné : ' + file.name + ' (' + size(file.size) + ') — cliquez « Publier ».' : '';
    if (file && card.getAttribute('data-name') === 'photo') { var img = card.querySelector('.prev img'); img.src = URL.createObjectURL(file); }
  });
  document.getElementById('fixedFiles').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-fact]'); if (!b) return;
    var card = b.closest('.fcard'), name = card.getAttribute('data-name');
    if (b.getAttribute('data-fact') === 'up') {
      b.disabled = true; b.textContent = 'Envoi…';
      upload(name, card.querySelector('input[type=file]').files[0], FIXED[name].max).then(function () { toast('Publié : ' + FIXED[name].label + ' mis à jour.'); loadFiles(); })
        .catch(fail).then(function () { b.disabled = false; b.textContent = 'Publier'; });
    } else {
      if (b.getAttribute('data-confirm') !== '1') { b.setAttribute('data-confirm', '1'); b.textContent = 'Confirmer ?'; return; }
      api('DELETE', '/api/admin/media?name=' + encodeURIComponent(name)).then(function () { toast('Fichier d’origine rétabli.'); loadFiles(); }).catch(fail);
    }
  });
  document.getElementById('imgUp').addEventListener('click', function () {
    var slug = document.getElementById('imgName').value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    if (!slug) { toast('Donnez un nom à l’image (ex. novia-factures).'); return; }
    var b = this; b.disabled = true; b.textContent = 'Envoi…';
    upload('img-' + slug, document.getElementById('imgFile').files[0], 3).then(function () { toast('Image téléversée : /media/img-' + slug); document.getElementById('imgName').value = ''; document.getElementById('imgFile').value = ''; loadFiles(); })
      .catch(fail).then(function () { b.disabled = false; b.textContent = 'Téléverser'; });
  });
  document.getElementById('imgLib').addEventListener('click', function (e) {
    var c = e.target.closest('[data-copy-url]'), d = e.target.closest('[data-del-img]');
    if (c) { var u = location.origin + c.getAttribute('data-copy-url'); (navigator.clipboard ? navigator.clipboard.writeText(c.getAttribute('data-copy-url')) : Promise.reject()).then(function () { toast('Adresse copiée : ' + c.getAttribute('data-copy-url')); }, function () { toast(u); }); }
    if (d) {
      if (d.getAttribute('data-confirm') !== '1') { d.setAttribute('data-confirm', '1'); d.textContent = 'Confirmer ?'; return; }
      api('DELETE', '/api/admin/media?name=' + encodeURIComponent(d.getAttribute('data-del-img'))).then(function () { toast('Image supprimée.'); loadFiles(); }).catch(fail);
    }
  });

  try { sessionStorage.removeItem('rc_pw'); } catch (e) {}
  if (pw && tok && tok.mustChange) openPw(true); else if (pw) showApp(); else showLogin();
})();
