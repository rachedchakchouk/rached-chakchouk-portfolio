(function () {
  var root = document.documentElement;
  // ---- content rendering (data in #defaultContent, overridable from the dashboard via /api/content) ----
  var CONTENT = JSON.parse(document.getElementById('defaultContent').textContent);
  var MAIN_HOST = 'rached-chakchouk.netlify.app';
  // backup mirror on Vercel: same content and files (proxied from the main site), no visit tracking
  var MIRROR = /\.vercel\.app$/.test(location.hostname);
  var PROD = location.hostname === MAIN_HOST || MIRROR;
  function e_(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function md(t) { return e_(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
  function B(o, f) { o = o || {}; f = f || e_; return '<span data-l="fr">' + f(o.fr) + '</span><span data-l="en">' + f(o.en != null && o.en !== '' ? o.en : o.fr) + '</span>'; }
  var ICONS = [['Java', 'java'], ['Spring', 'spring'], ['Hibernate', 'hibernate'], ['Swagger', 'swagger'], ['Maven', 'maven'], ['Angular', 'angular'], ['TypeScript', 'ts'], ['HTML', 'html'], ['Bootstrap', 'bootstrap'], ['React', 'react'], ['Capacitor', 'capacitor'], ['PostgreSQL', 'pg'], ['MySQL', 'mysql'], ['SQL Server', 'mssql'], ['MongoDB', 'mongo'], ['Liquibase', 'liquibase'], ['GitLab', 'gitlab'], ['GitHub Copilot', 'copilot'], ['GitHub', 'github'], ['Git', 'git'], ['Jenkins', 'jenkins'], ['Docker', 'docker'], ['SonarQube', 'sonar'], ['IntelliJ', 'intellij'], ['Eclipse', 'eclipse'], ['Visual Studio', 'vs'], ['Claude', 'claude']];
  function ico(name) { for (var i = 0; i < ICONS.length; i++) if (String(name).indexOf(ICONS[i][0]) === 0 && String(name).indexOf('JavaScript') !== 0) return '<i class="ti i-' + ICONS[i][1] + '" aria-hidden="true"></i>'; return ''; }
  function chip(n, key) { return '<li' + (key ? ' class="key"' : '') + '>' + ico(n) + e_(n) + '</li>'; }
  function logo(x) {
    if (x.logoImg) return '<span class="co-logo wide"><img src="' + e_(x.logoImg) + '" alt="' + e_(x.company) + '" loading="lazy"></span>';
    return '<span class="co-logo" aria-hidden="true">' + e_(x.logoText || String(x.company || '?').slice(0, 2).toUpperCase()) + '</span>';
  }
  function job(x) {
    var org = x.url ? '<a class="co-link" href="' + e_(x.url) + '" target="_blank" rel="noopener noreferrer">' + e_(x.company) + ' <span aria-hidden="true">↗</span></a>' : e_(x.company);
    var it = x.items || {};
    return '<article class="job' + (x.current ? ' current' : '') + '"><div class="when">' + B(x.when) + (x.current ? '<br><span class="now">' + B({ fr: 'En poste', en: 'Current' }) + '</span>' : '') + '</div>' +
      '<div class="card"><h3>' + B(x.role) + '</h3><div class="org">' + logo(x) + org + '</div>' +
      (x.context && (x.context.fr || x.context.en) ? '<p class="ctx" data-l="fr">' + e_(x.context.fr) + '</p><p class="ctx" data-l="en">' + e_(x.context.en || x.context.fr) + '</p>' : '') +
      '<ul data-l="fr">' + (it.fr || []).map(function (t) { return '<li>' + md(t) + '</li>'; }).join('') + '</ul>' +
      '<ul data-l="en">' + ((it.en && it.en.length ? it.en : it.fr) || []).map(function (t) { return '<li>' + md(t) + '</li>'; }).join('') + '</ul>' +
      ((x.stack || []).length ? '<ul class="stack">' + x.stack.map(function (n) { return chip(n); }).join('') + '</ul>' : '') + '</div></article>';
  }
  function renderContent() {
    var c = CONTENT, pr = c.profile || {};
    var el = document.getElementById('heroLead');
    if (el && pr.lead) el.innerHTML = '<p class="lead" data-l="fr">' + md(pr.lead.fr) + '</p><p class="lead" data-l="en">' + md(pr.lead.en || pr.lead.fr) + '</p>';
    el = document.getElementById('heroNow');
    if (el && pr.now) el.innerHTML = '<div class="now-v">' + B(pr.now.role) + ' <b>' + e_(pr.now.company) + '</b></div><div class="now-s" data-l="fr">' + e_(pr.now.desc && pr.now.desc.fr) + '</div><div class="now-s" data-l="en">' + e_(pr.now.desc && (pr.now.desc.en || pr.now.desc.fr)) + '</div>';
    (pr.stats || []).slice(0, 3).forEach(function (st, i) {
      var t = document.getElementById('stat' + i); if (!t) return;
      var u = st.unit && (st.unit.fr || st.unit.en) ? '<sup>' + B(st.unit) + '</sup>' : '';
      t.innerHTML = '<b><span class="count" data-to="' + (+st.value || 0) + '">' + (+st.value || 0) + '</span>' + u + '</b>' + B(st.label);
    });
    document.getElementById('skillsGrid').innerHTML = (c.skills || []).map(function (g) {
      return '<div class="skill-group"><h4>' + B(g.title) + '</h4><ul class="chips">' + (g.items || []).map(function (it) {
        return it.lang ? '<li data-l="' + e_(it.lang) + '"' + (it.key ? ' class="key"' : '') + '>' + ico(it.name) + e_(it.name) + '</li>' : chip(it.name, it.key);
      }).join('') + '</ul></div>';
    }).join('');
    document.getElementById('expList').innerHTML = (c.experiences || []).map(job).join('');
    document.getElementById('internList').innerHTML = (c.internships || []).map(job).join('');
    document.getElementById('eduList').innerHTML = (c.education || []).map(function (d) {
      var sc = d.url ? '<a class="co-link sm" href="' + e_(d.url) + '" target="_blank" rel="noopener noreferrer">' + B(d.school) + ' <span aria-hidden="true">↗</span></a>' : B(d.school);
      return '<div><span class="edu-logo" aria-hidden="true">' + e_(d.logoText || '') + '</span><div class="edu-txt"><h3>' + B(d.title) + '</h3><p>' + sc + '</p></div><span class="yr">' + e_(d.years) + '</span></div>';
    }).join('');
    document.getElementById('langList').innerHTML = (c.languages || []).map(function (l) {
      return '<li>' + B(l.name) + '<span>' + B(l.level) + '</span></li>';
    }).join('');
    if (window.__renderProjects) window.__renderProjects();
  }
  renderContent();
  if (PROD) {
    var ph = document.querySelector('.t-photo img'); if (ph) ph.src = '/media/photo';
    document.querySelectorAll('a.btn-pdf').forEach(function (a) { a.href = a.getAttribute('data-l') === 'en' ? '/media/cv-en.pdf' : '/media/cv-fr.pdf'; });
    fetch('/api/content', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (d && d.version) { CONTENT = d; renderContent(); }
    }).catch(function () {});
  }

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var langBtn = document.getElementById('langBtn');
  function applyLang(l) {
    root.setAttribute('data-lang', l);
    root.setAttribute('lang', l);
    langBtn.textContent = l === 'en' ? 'FR' : 'EN';
    langBtn.setAttribute('aria-label', l === 'en' ? 'Passer en français' : 'Switch to English');
  }
  var hash = (location.hash || '').replace('#', '');
  applyLang(hash === 'en' ? 'en' : hash === 'fr' ? 'fr' : (get('lang') || 'fr'));
  langBtn.addEventListener('click', function () {
    var l = root.getAttribute('data-lang') === 'en' ? 'fr' : 'en';
    applyLang(l); set('lang', l);
  });

  var themeBtn = document.getElementById('themeBtn');
  var saved = get('theme');
  if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);
  themeBtn.addEventListener('click', function () {
    var cur = root.getAttribute('data-theme') ||
      (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next); set('theme', next);
  });

  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = b.getAttribute('data-copy');
      var label = b.innerHTML;
      function done(ok) {
        var en = root.getAttribute('data-lang') === 'en';
        b.textContent = ok ? (en ? 'Copied' : 'Copié') : (en ? 'Select the text' : 'Sélectionnez le texte');
        setTimeout(function () { b.innerHTML = label; }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { selectVal(b); done(false); });
      } else { selectVal(b); done(false); }
    });
  });
  function selectVal(b) {
    var v = b.closest('.ccard').querySelector('.val');
    var r = document.createRange(); r.selectNodeContents(v);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  var links = Array.prototype.slice.call(document.querySelectorAll('nav.links a'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['skills', 'experience', 'projects', 'education', 'contact'].forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(pointer: fine)').matches;

  // scroll progress
  var bar = document.querySelector('.progress');
  function onScroll() {
    var h = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')';
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // spotlight following the cursor on cards
  document.querySelectorAll('.tile, .card, .skill-group, .panel').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  if (!reduce) {
    // background glow follows the mouse
    var glow = document.querySelector('.cursor-glow');
    if (fine && glow) {
      addEventListener('pointermove', function (e) {
        document.body.classList.add('has-pointer');
        glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px';
      }, { passive: true });
    }

    // 3D tilt on the portrait
    var photo = document.querySelector('.t-photo');
    if (fine && photo) {
      photo.addEventListener('pointermove', function (e) {
        var r = photo.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        photo.style.transform = 'perspective(900px) rotateY(' + (x * 8) + 'deg) rotateX(' + (-y * 8) + 'deg)';
      });
      photo.addEventListener('pointerleave', function () { photo.style.transform = ''; });
    }

    // magnetic primary button
    document.querySelectorAll('.mag').forEach(function (b) {
      if (!fine) return;
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .18) + 'px,' + ((e.clientY - r.top - r.height / 2) * .3) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });

    // rotating tech word
    var rot = document.querySelector('.rot');
    if (rot) {
      var items = rot.children, i = 0;
      setInterval(function () {
        var cur = items[i]; cur.classList.remove('on'); cur.classList.add('out');
        setTimeout(function () { cur.classList.remove('out'); }, 520);
        i = (i + 1) % items.length; items[i].classList.add('on');
      }, 2200);
    }

    // count-up on the key figures
    document.querySelectorAll('.count').forEach(function (c) {
      var to = +c.getAttribute('data-to'), t0 = null;
      function step(t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / 900); c.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); }
      c.textContent = '0'; requestAnimationFrame(step);
    });

    // reveal sections as they scroll in (content stays visible without JS)
    if ('IntersectionObserver' in window) {
      var targets = document.querySelectorAll('main .card, main .skill-group, main .panel, .contact-band, .sec-head');
      var ro = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
      }, { threshold: .12 });
      targets.forEach(function (t, k) {
        var r = t.getBoundingClientRect();
        if (r.top > innerHeight) { t.classList.add('reveal'); t.style.animationDelay = ((k % 4) * 60) + 'ms'; ro.observe(t); }
      });
    }
  }

  // contact form: sends automatically to the configured endpoint (Formspree-compatible JSON POST)
  // Netlify Forms: the form is detected at deploy time (data-netlify) and submissions arrive in Netlify → Forms + e-mail notification.
  var CONTACT_ENDPOINT = location.hostname === MAIN_HOST ? '/' : MIRROR ? '/api/contact' : '';
  var form = document.getElementById('contactForm');
  if (form) {
    var T = {
      fr: { name: 'Indiquez votre nom.', email: 'Indiquez un e-mail valide (ex. nom@domaine.com).', msg: 'Écrivez un message d\u2019au moins 10 caractères.', sending: 'Envoi en cours…', ok: 'Message envoyé. Je vous réponds rapidement.', ko: 'L\u2019envoi a échoué. Copiez mon e-mail ci-dessous et écrivez-moi directement.', off: 'L\u2019envoi automatique n\u2019est pas encore activé. Copiez mon e-mail ci-dessous.' },
      en: { name: 'Enter your name.', email: 'Enter a valid e-mail (e.g. name@domain.com).', msg: 'Write a message of at least 10 characters.', sending: 'Sending…', ok: 'Message sent. I will get back to you shortly.', ko: 'Sending failed. Copy my e-mail below and write to me directly.', off: 'Automatic sending is not enabled yet. Copy my e-mail below.' }
    };
    function t(k) { return T[root.getAttribute('data-lang') === 'en' ? 'en' : 'fr'][k]; }
    function check(id, ok, key) {
      var el = document.getElementById(id), er = document.getElementById(id + '-err');
      el.setAttribute('aria-invalid', ok ? 'false' : 'true'); er.textContent = ok ? '' : t(key); return ok;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements, st = document.getElementById('cf-status');
      var v1 = check('cf-name', f.name.value.trim().length >= 2, 'name');
      var v2 = check('cf-email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim()), 'email');
      var v3 = check('cf-msg', f.message.value.trim().length >= 10, 'msg');
      if (!(v1 && v2 && v3)) { form.querySelector('[aria-invalid="true"]').focus(); return; }
      if (f._gotcha.value) return;
      if (!CONTACT_ENDPOINT) { st.textContent = t('off'); return; }
      var btn = form.querySelector('.send'); btn.disabled = true; st.textContent = t('sending');
      var payload = new URLSearchParams({ 'form-name': 'contact', name: f.name.value.trim(), email: f.email.value.trim(), message: f.message.value.trim(), _gotcha: '' });
      fetch(CONTACT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: payload.toString() })
        .then(function (r) { if (!r.ok) throw new Error(r.status); st.textContent = t('ok'); form.reset(); })
        .catch(function () { st.textContent = t('ko'); })
        .then(function () { btn.disabled = false; });
    });
  }

  // online CV viewer
  var vw = document.getElementById('cvViewer');
  if (vw) {
    var pages = document.getElementById('cvPages'), zoomEl = document.getElementById('cvZoom'), pdfA = document.getElementById('cvPdf');
    var zoom = 1, cvLang = 'FR', lastFocus = null;
    function renderCv() {
      var url = PROD ? '/media/cv-' + cvLang.toLowerCase() + '.pdf' : 'Rached_Chakchouk_CV_' + cvLang + '.pdf';
      var small = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
      pages.innerHTML = small
        ? '<div class="v-mobile"><svg class="ic-pdf" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#e5484d"/><path d="M14 2v5h5" fill="#ffb3b5"/></svg><p>' + (cvLang === 'FR' ? 'Sur mobile, le CV s’ouvre dans le lecteur PDF de votre téléphone.' : 'On mobile, the resume opens in your phone’s PDF viewer.') + '</p><a class="btn btn-pdf" href="' + url + '" target="_blank" rel="noopener">' + (cvLang === 'FR' ? 'Ouvrir le CV (PDF)' : 'Open resume (PDF)') + '</a></div>'
        : '<iframe class="v-frame" src="' + url + '#view=FitH" title="' + (cvLang === 'FR' ? 'CV de Rached Chakchouk' : 'Rached Chakchouk resume') + '"></iframe>';
      pdfA.href = url; pdfA.setAttribute('download', cvLang === 'EN' ? 'Rached_Chakchouk_Resume.pdf' : 'Rached_Chakchouk_CV_FR.pdf'); pdfA.title = cvLang === 'EN' ? 'Download PDF' : 'Télécharger le PDF';
      vw.querySelectorAll('[data-cvlang]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-cvlang') === cvLang ? 'true' : 'false'); });
    }
    function applyZoom() {
      zoom = Math.max(.5, Math.min(2, zoom));
      pages.style.setProperty('--vw', Math.round(820 * zoom) + 'px'); pages.style.setProperty('--vz', zoom);
      zoomEl.textContent = Math.round(zoom * 100) + '%';
    }
    function openCv() {
      lastFocus = document.activeElement;
      cvLang = root.getAttribute('data-lang') === 'en' ? 'EN' : 'FR'; renderCv();
      vw.hidden = false; document.body.classList.add('noscroll');
      document.getElementById('cvClose').focus();
    }
    function closeCv() { vw.hidden = true; document.body.classList.remove('noscroll'); if (lastFocus) lastFocus.focus(); }
    document.querySelectorAll('[data-open-cv]').forEach(function (b) { b.addEventListener('click', openCv); });
    document.getElementById('cvClose').addEventListener('click', closeCv);
    document.getElementById('cvIn').addEventListener('click', function () { zoom += .25; applyZoom(); });
    document.getElementById('cvOut').addEventListener('click', function () { zoom -= .25; applyZoom(); });
    vw.querySelectorAll('[data-cvlang]').forEach(function (b) { b.addEventListener('click', function () { cvLang = b.getAttribute('data-cvlang'); renderCv(); }); });
    pages.addEventListener('click', function (e) { if (e.target === pages) closeCv(); });
    document.addEventListener('keydown', function (e) {
      if (vw.hidden) return;
      if (e.key === 'Escape') closeCv();
      if (e.key === 'Tab') {
        var f = vw.querySelectorAll('button, a[href], [tabindex="0"]'), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  // ---- projects (data-driven: edit PROJECTS to update the section) ----
  var PROJECTS = CONTENT.projects || [];
  var grid = document.getElementById('projectGrid');
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function bi(o) { return '<span data-l="fr">' + esc(o.fr) + '</span><span data-l="en">' + esc(o.en) + '</span>'; }
  var curFilter = 'all';
  function applyFilter() { grid.querySelectorAll('.pcard').forEach(function (card) { card.hidden = !(curFilter === 'all' || card.getAttribute('data-cats').split(' ').indexOf(curFilter) > -1); }); }
  window.__renderProjects = function () { if (!grid) return; PROJECTS = CONTENT.projects || []; grid.innerHTML = PROJECTS.map(function (p) {
      var cover = p.shots && p.shots.length ? '<img src="' + esc(p.shots[0]) + '" alt="" loading="lazy">' : '<span class="pc-mono">' + esc(p.mono) + '</span>';
      return '<button class="pcard' + (p.feat ? ' feat' : '') + '" type="button" data-id="' + p.id + '" data-cats="' + p.cats.join(' ') + '">' +
        '<div class="pc-cover">' + cover + '</div><div class="pc-body"><div class="pc-top"><span class="pc-kind">' + bi(p.kind) + '</span><span class="pc-org">' + esc(p.org.name) + '</span></div>' +
        '<h3 class="pc-title">' + bi(p.title) + '</h3><p class="pc-desc">' + bi(p.desc) + '</p><span class="pc-more"><span data-l="fr">Voir le détail</span><span data-l="en">View details</span> →</span></div></button>';
    }).join(''); applyFilter(); };
  if (grid) {
    window.__renderProjects();
    var chips = document.querySelectorAll('.fchip');
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        curFilter = c.getAttribute('data-filter');
        chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
        applyFilter();
      });
    });
    var pm = document.getElementById('projModal'), pmBody = document.getElementById('pmBody'), pmLast = null;
    function openProject(id) {
      var p = PROJECTS.filter(function (x) { return x.id === id; })[0]; if (!p) return; p.items = p.items || { fr: [], en: [] }; p.stack = p.stack || []; p.links = p.links || []; p.org = p.org || { name: '', url: '', when: {} };
      var li = function (arr) { return arr.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join(''); };
      var gallery = p.shots && p.shots.length ? '<div class="pm-h"><span data-l="fr">Captures d’écran</span><span data-l="en">Screenshots</span></div><div class="pm-gallery">' +
        p.shots.map(function (s, k) { return '<button type="button" data-zoom="' + esc(s) + '"><img src="' + esc(s) + '" alt="' + esc(p.title.en) + ' – ' + (k + 1) + '" loading="lazy"></button>'; }).join('') + '</div>' : '';
      var links = p.links.map(function (l) { return '<a class="btn" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label) + ' ↗</a>'; }).join('');
      pmBody.innerHTML = '<div class="pm-kind">' + bi(p.kind) + '</div><h3 class="pm-title" id="pmTitle">' + bi(p.title) + '</h3>' +
        '<p class="pm-org"><a href="' + esc(p.org.url) + '" target="_blank" rel="noopener noreferrer">' + esc(p.org.name) + ' ↗</a> · ' + bi(p.org.when) + '</p>' +
        '<div class="pm-grid"><div class="pm-box"><h4><span data-l="fr">Problème</span><span data-l="en">Problem</span></h4><p>' + bi(p.problem) + '</p></div>' +
        '<div class="pm-box"><h4><span data-l="fr">Mon rôle</span><span data-l="en">My role</span></h4><p>' + bi(p.role) + '</p></div></div>' +
        '<div class="pm-h"><span data-l="fr">Réalisations</span><span data-l="en">What I built</span></div>' +
        '<ul class="pm-list" data-l="fr">' + li(p.items.fr) + '</ul><ul class="pm-list" data-l="en">' + li(p.items.en) + '</ul>' +
        '<div class="pm-h">Stack</div><ul class="stack">' + p.stack.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
        gallery + (links ? '<div class="pm-links">' + links + '</div>' : '');
      pmLast = document.activeElement; pm.hidden = false; document.body.classList.add('noscroll');
      document.getElementById('pmClose').focus();
    }
    function closeProject() { pm.hidden = true; document.body.classList.remove('noscroll'); if (pmLast) pmLast.focus(); }
    grid.addEventListener('click', function (e) { var c = e.target.closest('.pcard'); if (c) openProject(c.getAttribute('data-id')); });
    document.getElementById('pmClose').addEventListener('click', closeProject);
    pm.addEventListener('click', function (e) {
      if (e.target === pm) return closeProject();
      var z = e.target.closest('[data-zoom]');
      if (z) {
        var lb = document.createElement('div'); lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', 'Image');
        lb.innerHTML = '<img src="' + z.getAttribute('data-zoom') + '" alt="">'; lb.tabIndex = -1;
        lb.addEventListener('click', function () { lb.remove(); z.focus(); });
        lb.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { ev.stopPropagation(); lb.remove(); z.focus(); } });
        document.body.appendChild(lb); lb.focus();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (pm.hidden || document.querySelector('.lightbox')) return;
      if (e.key === 'Escape') closeProject();
      if (e.key === 'Tab') {
        var f = pm.querySelectorAll('button, a[href]'), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  var yr = document.getElementById('yr'); if (yr) { var y = new Date().getFullYear(); if (y > 2026) yr.textContent = '2026–' + y; }

  // ---- cookieless visit tracking (only on the production site) ----
  var TRACK = location.hostname === MAIN_HOST && navigator.doNotTrack !== '1';
  try { if (localStorage.getItem('rc_ignore') === '1') TRACK = false; } catch (e) {}
  function track(payload) {
    if (!TRACK) return;
    var body = JSON.stringify(payload);
    try {
      if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
      else fetch('/api/track', { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {}
  }
  track({ type: 'pageview', path: location.pathname, ref: document.referrer, lang: root.getAttribute('data-lang') || 'fr' });
  document.addEventListener('click', function (e) {
    var el = e.target.closest('a, button'); if (!el) return;
    var href = el.getAttribute('href') || '';
    if (el.classList.contains('btn-pdf') || el.id === 'cvPdf') track({ type: 'event', name: 'cv_download' });
    else if (el.hasAttribute('data-open-cv')) track({ type: 'event', name: 'cv_view' });
    else if (el.classList.contains('pcard')) track({ type: 'event', name: 'project_open', label: el.getAttribute('data-id') });
    else if (el.hasAttribute('data-copy')) track({ type: 'event', name: el.getAttribute('data-copy').indexOf('@') > -1 ? 'email_copy' : 'phone_copy' });
    else if (/linkedin\.com/.test(href)) track({ type: 'event', name: 'linkedin' });
    else if (/github\.com/.test(href)) track({ type: 'event', name: 'github' });
  }, true);
  var cf = document.getElementById('contactForm');
  if (cf) cf.addEventListener('submit', function () { setTimeout(function () { if (!cf.querySelector('[aria-invalid="true"]')) track({ type: 'event', name: 'contact_submit' }); }, 0); });
})();
