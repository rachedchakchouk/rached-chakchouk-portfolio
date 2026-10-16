fetch('data.json').then(r=>r.json()).then(D=>{

const $=s=>document.querySelector(s);
const esc=s=>(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function opts(sel,key,label){const c={};D.forEach(d=>c[d[key]]=(c[d[key]]||0)+1);
sel.innerHTML='<option value="">'+label+'</option>'+Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<option value="${esc(k)}">${esc(k)} (${v})</option>`).join('')}
opts($('#city'),'c','Toutes les villes');opts($('#orig'),'og','Toutes les origines');
$('#stats').innerHTML=`<span><b>${D.length}</b> sociétés</span><span><b>${D.filter(d=>d.li).length}</b> pages LinkedIn</span><span><b>${D.filter(d=>d.j).length}</b> pages carrières</span><span><b>${D.filter(d=>d.w).length}</b> sites web</span>`;
let sortK='n',dir=1;
function render(){const q=$('#q').value.toLowerCase().trim(),c=$('#city').value,o=$('#orig').value,j=$('#jobs').checked;
const r=D.filter(d=>(!c||d.c===c)&&(!o||d.og===o)&&(!j||d.j)&&(!q||[d.n,d.s,d.o,d.l,d.st,d.no].join(' ').toLowerCase().includes(q)))
.sort((a,b)=>(a[sortK]||'').localeCompare(b[sortK]||'','fr')*dir);
$('#count').textContent=r.length+' affichées';
const L=(u,t)=>u?`<a href="${esc(u)}" target="_blank" rel="noopener">${t}</a>`:'';
$('#tb').innerHTML=r.map(d=>{const ln=[L(d.li,'LinkedIn'),L(d.j,'Carrières'),L(d.w,'Site')].filter(Boolean).join('');
return `<tr><td><div class="name">${esc(d.n)}</div>${d.no?`<div class="notes">${esc(d.no)}</div>`:''}</td>
<td class="og">${esc(d.o||'À vérifier')}</td><td>${esc(d.s)}</td>
<td><span class="chip${d.c==='À vérifier'?' unk':''}">${esc(d.c)}</span><div class="loc">${esc(d.l)}</div></td>
<td><div class="links">${ln||'<span class="no">à vérifier</span>'}</div></td><td class="stack">${esc(d.st)}</td></tr>`}).join('');}
['#q','#city','#orig','#jobs'].forEach(s=>$(s).addEventListener('input',render));
document.querySelectorAll('th[data-k]').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.k;dir=sortK===k?-dir:1;sortK=k;render()}));
render();

}).catch(()=>{document.getElementById('tb').innerHTML='<tr><td colspan="6">Impossible de charger la liste.</td></tr>'});
