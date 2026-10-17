(async()=>{
const D=await fetch('data.json').then(r=>r.json());
const T={fr:{t:"102 questions d'entretien technique, expliquées simplement",s:"Java, Spring Boot, JPA, SQL, Angular, RxJS, REST, Git et Docker. Chaque réponse est accompagnée d'un schéma animé qui montre, étape par étape, la ligne de code exécutée et ce qui se passe.",all:"Tout",q:"Rechercher…",pdf:"Télécharger le PDF",none:"Aucune question."},
en:{t:"102 technical interview questions, explained simply",s:"Java, Spring Boot, JPA, SQL, Angular, RxJS, REST, Git and Docker. Each answer comes with an animated diagram showing, step by step, the line of code being executed and what happens.",all:"All",q:"Search…",pdf:"Download the PDF",none:"No question."}};
let lang=(new URLSearchParams(location.search).get('lang')||'fr'), sec='', q='';
const secs=[...new Set(D.map(x=>x.sec))];
const $=id=>document.getElementById(id);
function esc(s){return s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function bar(){
  const L=T[lang];
  $('bar').innerHTML=`<button data-l="fr" aria-pressed="${lang==='fr'}">FR</button><button data-l="en" aria-pressed="${lang==='en'}">EN</button>`+
   `<button data-s="" aria-pressed="${sec===''}">${L.all}</button>`+secs.map(s=>`<button data-s="${esc(s)}" aria-pressed="${sec===s}">${esc(s)}</button>`).join('')+
   `<input type="search" id="q" placeholder="${L.q}" value="${esc(q)}"><a class="dl" href="Questions_entretien_Java_Spring_Angular.pdf" download>${L.pdf}</a>`;
  $('bar').querySelectorAll('button').forEach(b=>b.onclick=()=>{ if(b.dataset.l){lang=b.dataset.l;document.documentElement.lang=lang;} else sec=b.dataset.s; draw(); });
  $('q').oninput=e=>{q=e.target.value;grid();};
}
function grid(){
  const L=T[lang], k=q.toLowerCase();
  const list=D.filter(x=>(!sec||x.sec===sec)&&(!k||(x[lang].tab+' '+x[lang].steps.join(' ')).toLowerCase().includes(k)));
  $('grid').innerHTML=list.length?list.map(x=>`<article class="card"><img loading="lazy" src="gif/q${String(x.n).padStart(3,'0')}.gif" alt="${esc(x[lang].tab)}"><div class="b"><span class="chip">${esc(x.sec)} · ${x.n}/102</span><h2>${esc(x[lang].tab)}</h2><ol>${x[lang].steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></div></article>`).join(''):`<p class="empty">${L.none}</p>`;
}
function draw(){const L=T[lang];$('t').textContent=L.t;$('s').textContent=L.s;bar();grid();}
draw();
})();
