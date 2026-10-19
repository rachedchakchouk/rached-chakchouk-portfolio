(function(){var r=document.documentElement;function g(k){try{return localStorage.getItem(k)}catch(e){return null}}
var t=g('theme');if(t==='dark'||t==='light')r.setAttribute('data-theme',t);
var b=document.getElementById('themeBtn');if(b)b.addEventListener('click',function(){var c=r.getAttribute('data-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var n=c==='dark'?'light':'dark';r.setAttribute('data-theme',n);try{localStorage.setItem('theme',n)}catch(e){}});})();
fetch('data.json',{cache:'no-cache'}).then(r=>r.json()).then(D=>{

const $=s=>document.querySelector(s);
const esc=s=>(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function opts(sel,key,label){const c={};D.forEach(d=>[].concat(d[key]||[]).forEach(v=>c[v]=(c[v]||0)+1));
sel.innerHTML='<option value="">'+label+'</option>'+Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<option value="${esc(k)}">${esc(k)} (${v})</option>`).join('')}
D.forEach(d=>{if(!d.cs)d.cs=[d.c];if(!d.ogs)d.ogs=[d.og]});opts($('#city'),'cs','Toutes les villes');opts($('#orig'),'ogs','Toutes les origines');
$('#stats').innerHTML=`<span><b>${D.length}</b> sociétés</span><span><b>${D.filter(d=>d.li).length}</b> pages LinkedIn</span><span><b>${D.filter(d=>d.j).length}</b> pages carrières</span><span><b>${D.filter(d=>d.w).length}</b> sites web</span>`;
let sortK='n',dir=1,page=1;
const PS_KEY='offshore_ps';let ps=25;try{ps=+localStorage.getItem(PS_KEY)||25}catch(e){}
$('#ps').value=String(ps);
function render(){const q=$('#q').value.toLowerCase().trim(),c=$('#city').value,o=$('#orig').value,j=$('#jobs').checked;
const r=D.filter(d=>(!c||d.cs.includes(c))&&(!o||d.ogs.includes(o))&&(!j||d.j)&&(!q||[d.n,d.s,d.o,d.l,d.st,d.no].join(' ').toLowerCase().includes(q)))
.sort((a,b)=>(a[sortK]||'').localeCompare(b[sortK]||'','fr')*dir);
const pages=Math.max(1,Math.ceil(r.length/ps));if(page>pages)page=pages;
const from=(page-1)*ps,shown=r.slice(from,from+ps);
$('#count').textContent=r.length+' résultat'+(r.length>1?'s':'');
pager(r.length,pages,from,shown.length);
const dom=d=>{for(const u of [d.w,d.j]){if(!u)continue;try{const h=new URL(u).hostname.replace(/^www\./,'');if(!/linkedin\.com$/.test(h))return h}catch(e){}}return ''};
const ini=d=>`<span class="ini" aria-hidden="true">${esc((d.n||'?').trim().charAt(0).toUpperCase())}</span>`;
const logo=d=>{const h=dom(d);return h?`<span class="lg"><img src="${d.ic?esc(d.ic):`https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=64`}" data-h="${esc(h)}" alt="" width="28" height="28" loading="lazy" referrerpolicy="no-referrer" data-i="${esc((d.n||'?').trim().charAt(0).toUpperCase())}"></span>`:`<span class="lg">${ini(d)}</span>`};
const L=(u,t)=>u?`<a href="${esc(u)}" target="_blank" rel="noopener">${t}</a>`:'';
$('#tb').innerHTML=shown.map(d=>{const ln=[L(d.li,'LinkedIn'),L(d.j,'Carrières'),L(d.w,'Site')].filter(Boolean).join('');
return `<tr><td><div class="co">${logo(d)}<div><div class="name">${esc(d.n)}</div>${d.no?`<div class="notes">${esc(d.no)}</div>`:''}${d.vf?`<div class="notes vf">✓ ${esc(d.vf)}</div>`:''}</div></div></td>
<td class="og">${esc(d.o||'À vérifier')}</td><td>${esc(d.s)}</td>
<td><span class="chips">${d.cs.map(v=>`<span class="chip${v==='À vérifier'?' unk':''}">${esc(v)}</span>`).join('')}</span><div class="loc">${esc(d.l)}</div></td>
<td><div class="links">${ln||'<span class="no">à vérifier</span>'}</div></td><td class="stack">${esc(d.st)}</td></tr>`}).join('');}
function pager(total,pages,from,n){
const nums=[];for(let i=1;i<=pages;i++){if(i===1||i===pages||Math.abs(i-page)<=1)nums.push(i);else if(nums[nums.length-1]!=='…')nums.push('…');}
const btn=(lab,p,dis,cur,aria)=>`<button type="button" data-p="${p}"${dis?' disabled':''}${cur?' aria-current="page"':''} aria-label="${aria||('Page '+lab)}">${lab}</button>`;
const html=total?`<span class="pinfo">${from+1}–${from+n} sur ${total}</span><span class="pbtns">`+btn('‹',page-1,page===1,false,'Page précédente')+nums.map(x=>x==='…'?'<span class="dots">…</span>':btn(x,x,false,x===page)).join('')+btn('›',page+1,page===pages,false,'Page suivante')+'</span>':'<span class="pinfo">Aucune société ne correspond.</span>';
document.querySelectorAll('.pager').forEach(el=>el.innerHTML=html);}
document.querySelectorAll('.pager').forEach(el=>el.addEventListener('click',e=>{const b=e.target.closest('button[data-p]');if(!b||b.disabled)return;page=+b.dataset.p;render();if(el.id==='pgBot')$('.bar').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}));
$('#ps').addEventListener('change',e=>{ps=+e.target.value;page=1;try{localStorage.setItem(PS_KEY,ps)}catch(_){}render();});
['#q','#city','#orig','#jobs'].forEach(s=>$(s).addEventListener('input',()=>{page=1;render();}));
document.querySelectorAll('th[data-k]').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.k;dir=sortK===k?-dir:1;sortK=k;page=1;render()}));
const toIni=t=>{if(t.dataset.h&&!t.dataset.alt){t.dataset.alt='1';t.src='https://icons.duckduckgo.com/ip3/'+t.dataset.h+'.ico';return}const sp=document.createElement('span');sp.className='ini';sp.textContent=t.dataset.i;t.replaceWith(sp)};
document.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.dataset.i)toIni(t)},true);
document.addEventListener('load',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.naturalHeight&&t.naturalWidth/t.naturalHeight>1.6&&t.parentNode)t.parentNode.classList.add('wide');if(t&&t.tagName==='IMG'&&t.dataset.i&&((!t.dataset.alt&&t.naturalWidth<=16)||(t.dataset.alt&&t.naturalWidth===48)))toIni(t)},true);
render();

}).catch(()=>{document.getElementById('tb').innerHTML='<tr><td colspan="6">Impossible de charger la liste.</td></tr>'});
