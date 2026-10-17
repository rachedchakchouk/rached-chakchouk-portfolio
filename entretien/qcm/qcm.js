(async () => {
  'use strict';
  const $ = id => document.getElementById(id);
  const root = document.documentElement;
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const N = 10;
  const ORDER = ["Java", "Spring Boot", "JPA / Hibernate", "SQL / PostgreSQL", "Angular", "RxJS", "REST, Git, Docker"];
  const UI = {
    fr: { h1: 'QCM de révision : <span class="grad">10 questions au hasard</span>', lead: 'Un tirage différent à chaque ouverture de la page, tous les sujets couverts : Java, Spring Boot, JPA, SQL, Angular, RxJS, REST / Git / Docker.', q: (i, n) => `Question ${i} sur ${n}`, good: 'Bonne réponse !', bad: 'Pas tout à fait.', answer: 'La bonne réponse : ', see: 'Voir l’explication animée →', next: 'Question suivante', finish: 'Voir mon score', score: 'Votre score', again: 'Nouveau QCM (10 autres questions)', bySec: 'Par sujet', review: 'Correction', foot: 'Astuce : touches 1 à 4 pour répondre, Entrée pour continuer.', back: '← Questions', msg: s => s >= 9 ? 'Excellent, vous êtes prêt pour l’entretien.' : s >= 7 ? 'Très bien, encore quelques points à revoir.' : s >= 5 ? 'Pas mal : revoyez les explications animées des questions ratées.' : 'Courage : relisez les explications animées, puis retentez un QCM.', seen: (a, b) => `${a} questions sur ${b} déjà vues : les prochains tirages privilégient celles que vous n’avez pas encore faites.`, err: 'Impossible de charger les questions.' },
    en: { h1: 'Revision quiz: <span class="grad">10 random questions</span>', lead: 'A different draw every time the page opens, covering every topic: Java, Spring Boot, JPA, SQL, Angular, RxJS, REST / Git / Docker.', q: (i, n) => `Question ${i} of ${n}`, good: 'Correct!', bad: 'Not quite.', answer: 'Correct answer: ', see: 'See the animated explanation →', next: 'Next question', finish: 'See my score', score: 'Your score', again: 'New quiz (10 other questions)', bySec: 'By topic', review: 'Answers', foot: 'Tip: press 1 to 4 to answer, Enter to continue.', back: '← Questions', msg: s => s >= 9 ? 'Excellent, you are ready for the interview.' : s >= 7 ? 'Very good, just a few points to review.' : s >= 5 ? 'Not bad: review the animated explanations of the missed questions.' : 'Keep going: read the animated explanations, then try another quiz.', seen: (a, b) => `${a} of ${b} questions already seen: the next draws favour the ones you have not done yet.`, err: 'Could not load the questions.' }
  };
  const qLang = new URLSearchParams(location.search).get('lang');
  let lang = (qLang === 'en' || qLang === 'fr') ? qLang : (ls.get('lang') === 'en' ? 'en' : 'fr');
  const U = () => UI[lang];

  // theme (shared with the portfolio)
  const th = ls.get('theme'); if (th === 'dark' || th === 'light') root.setAttribute('data-theme', th);
  $('themeBtn').addEventListener('click', () => { const c = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); const n = c === 'dark' ? 'light' : 'dark'; root.setAttribute('data-theme', n); ls.set('theme', n); });

  let DB;
  try { DB = await fetch('mcq.json').then(r => r.json()); } catch (e) { $('app').textContent = U().err; return; }
  const ALL = Object.keys(DB);

  const rnd = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* Draw: one question per topic (7), then 3 more from different topics when possible.
     Questions not yet seen (localStorage) are preferred; once all 102 are seen the pool restarts. */
  function draw() {
    let seen = []; try { seen = JSON.parse(ls.get('qcm_seen') || '[]'); } catch (e) {}
    seen = seen.filter(id => DB[id]);
    if (ALL.length - seen.length < N) seen = [];
    const fresh = id => !seen.includes(id);
    const bySec = {}; ORDER.forEach(s => bySec[s] = shuffle(ALL.filter(id => DB[id].sec === s)));
    const pickFrom = s => { const l = bySec[s]; const i = l.findIndex(fresh); const id = (i >= 0 ? l.splice(i, 1) : l.splice(0, 1))[0]; return id; };
    const picked = ORDER.map(pickFrom).filter(Boolean);
    const extraSecs = shuffle(ORDER).slice(0, N - picked.length);
    extraSecs.forEach(s => { const id = pickFrom(s); if (id) picked.push(id); });
    ls.set('qcm_seen', JSON.stringify(seen.concat(picked)));
    // shuffle question order and each question's option order
    return shuffle(picked).map(id => ({ id, perm: shuffle([0, 1, 2, 3]), choice: null }));
  }

  let quiz = draw(), idx = 0;
  const say = t => { if (window.a11ySpeak) window.a11ySpeak(t); };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const L = it => DB[it.id][lang];
  const okPos = it => it.perm.indexOf(L(it).ok);
  const link = it => `../?lang=${lang}&q=${encodeURIComponent(it.id)}`;

  function header() {
    const u = U(); root.lang = lang; root.setAttribute('data-lang', lang);
    document.title = lang === 'en' ? 'Revision quiz — Java, Spring, Angular' : 'QCM de révision — Java, Spring, Angular';
    $('h1').innerHTML = u.h1; $('lead').textContent = u.lead; $('foot').textContent = u.foot; $('back').textContent = u.back; $('back').href = '../?lang=' + lang;
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false'));
  }

  function showQ() {
    const u = U(), it = quiz[idx], d = L(it), ans = it.choice !== null;
    const correct = okPos(it);
    $('app').innerHTML =
      `<div class="meta"><span>${u.q(idx + 1, quiz.length)}</span><span class="chip">${esc(DB[it.id].sec)}</span></div>` +
      `<div class="bar" aria-hidden="true"><i style="width:${(idx + (ans ? 1 : 0)) / quiz.length * 100}%"></i></div>` +
      `<p class="topic">${esc(DB[it.id]['title_' + lang])}</p>` +
      `<h2 class="q" id="qtext">${esc(d.q)}</h2>` +
      `<ul class="opts" role="list" aria-labelledby="qtext">` + it.perm.map((o, k) => {
        let cls = '', mark = '';
        if (ans) { if (k === correct) { cls = 'ok'; mark = '✓'; } else if (k === it.choice) { cls = 'no'; mark = '✗'; } else cls = 'dim'; }
        return `<li><button type="button" class="opt ${cls}" data-k="${k}" ${ans ? 'disabled' : ''}><span class="k">${k + 1}</span><span>${esc(d.opts[o])}</span>${mark ? `<span class="mark" aria-hidden="true">${mark}</span>` : ''}</button></li>`;
      }).join('') + `</ul>` +
      (ans ? `<div class="fb ${it.choice === correct ? 'good' : 'bad'}" role="status"><strong>${it.choice === correct ? u.good : u.bad}</strong>${it.choice === correct ? '' : esc(u.answer + d.opts[L(it).ok]) + '. '}${esc(d.why)}<br><a href="${link(it)}">${u.see}</a></div>` +
        `<div class="actions"><button type="button" class="btn primary" id="nextBtn">${idx === quiz.length - 1 ? u.finish : u.next}</button></div>` : '');
    $('app').querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => answer(+b.dataset.k)));
    if (ans) { const n = $('nextBtn'); n.addEventListener('click', next); }
  }
  function answer(k) {
    const it = quiz[idx]; if (it.choice !== null) return;
    it.choice = k; showQ();
    const u = U(), d = L(it), ok = k === okPos(it);
    say((ok ? u.good : u.bad + ' ' + u.answer + d.opts[d.ok] + '.') + ' ' + d.why);
    $('nextBtn').focus();
  }
  function next() { if (idx < quiz.length - 1) { idx++; showQ(); readQ(); $('app').querySelector('.opt').focus(); } else showEnd(); }
  function readQ() { const it = quiz[idx], d = L(it); say(U().q(idx + 1, quiz.length) + '. ' + d.q + ' ' + it.perm.map((o, k) => (k + 1) + ': ' + d.opts[o]).join('. ')); }

  function showEnd() {
    const u = U(); idx = quiz.length;
    const score = quiz.filter(it => it.choice === okPos(it)).length;
    const per = {}; quiz.forEach(it => { const s = DB[it.id].sec; per[s] = per[s] || [0, 0]; per[s][1]++; if (it.choice === okPos(it)) per[s][0]++; });
    let seen = []; try { seen = JSON.parse(ls.get('qcm_seen') || '[]'); } catch (e) {}
    $('app').innerHTML =
      `<p class="meta">${u.score}</p><p class="score">${score} / ${quiz.length}</p><p>${u.msg(score)}</p>` +
      `<div class="actions"><button type="button" class="btn primary" id="again">${u.again}</button></div>` +
      `<h2 class="q" style="margin-top:20px">${u.bySec}</h2><div class="secs">` + ORDER.filter(s => per[s]).map(s => `<div><span>${esc(s)}</span><strong>${per[s][0]}/${per[s][1]}</strong></div>`).join('') + `</div>` +
      `<h2 class="q">${u.review}</h2><ol class="review">` + quiz.map(it => { const d = L(it), ok = it.choice === okPos(it); return `<li><span class="r ${ok ? 'good' : 'bad'}" aria-label="${ok ? u.good : u.bad}">${ok ? '✓' : '✗'}</span>${esc(d.q)}<p>${esc(u.answer + d.opts[d.ok])}. ${esc(d.why)}</p><a href="${link(it)}">${u.see}</a></li>`; }).join('') + `</ol>` +
      `<p class="foot">${u.seen(Math.min(seen.length, ALL.length), ALL.length)}</p>`;
    $('again').addEventListener('click', () => { quiz = draw(); idx = 0; showQ(); readQ(); window.scrollTo(0, 0); });
    say(u.score + ' : ' + score + ' / ' + quiz.length + '. ' + u.msg(score));
    $('again').focus();
  }

  function renderAll() { header(); if (idx >= quiz.length) showEnd(); else showQ(); }
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => { lang = b.dataset.lang; ls.set('lang', lang); try { history.replaceState(null, '', '?lang=' + lang); } catch (e) {} renderAll(); }));
  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('.a11y-panel,.co2-card,input')) return;
    if (idx < quiz.length && /^[1-4]$/.test(e.key) && quiz[idx].choice === null) answer(+e.key - 1);
    else if (e.key === 'Enter' && $('nextBtn') && document.activeElement !== $('nextBtn')) next();
  });
  renderAll();
})();
