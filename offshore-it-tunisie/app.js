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
if(![25,50,100].includes(ps))ps=25;$('#ps').value=String(ps);
const norm=s=>(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
D.forEach(d=>{d._t=norm([d.n,d.s,d.o,d.l,d.st,d.no,d.cs.join(' '),d.ogs.join(' ')].join(' '))});
const KEYS=['n','og','s','c','st'];
const has=(sel,v)=>[...$(sel).options].some(o=>o.value===v);
/* Etat initial depuis l'URL (lien partageable) */
(function(){const u=new URLSearchParams(location.search);
if(u.get('q'))$('#q').value=u.get('q');
if(u.get('ville')&&has('#city',u.get('ville')))$('#city').value=u.get('ville');
if(u.get('origine')&&has('#orig',u.get('origine')))$('#orig').value=u.get('origine');
if(u.get('carrieres')==='1')$('#jobs').checked=true;
if(KEYS.includes(u.get('tri')))sortK=u.get('tri');if(u.get('sens')==='desc')dir=-1;
const pg=parseInt(u.get('page'),10);if(pg>1)page=pg;})();
function syncUrl(){const u=new URLSearchParams();const q=$('#q').value.trim();
if(q)u.set('q',q);if($('#city').value)u.set('ville',$('#city').value);if($('#orig').value)u.set('origine',$('#orig').value);
if($('#jobs').checked)u.set('carrieres','1');if(sortK!=='n')u.set('tri',sortK);if(dir<0)u.set('sens','desc');if(page>1)u.set('page',page);
const s=u.toString();try{history.replaceState(null,'',location.pathname+(s?'?'+s:'')+location.hash)}catch(e){}}
const active=()=>!!($('#q').value.trim()||$('#city').value||$('#orig').value||$('#jobs').checked||sortK!=='n'||dir<0);
function render(){const terms=norm($('#q').value).split(/\s+/).filter(Boolean),c=$('#city').value,o=$('#orig').value,j=$('#jobs').checked;
const r=D.filter(d=>(!c||d.cs.includes(c))&&(!o||d.ogs.includes(o))&&(!j||d.j)&&terms.every(t=>d._t.includes(t)))
.sort((a,b)=>{const x=(a[sortK]||''),y=(b[sortK]||'');if(!x!==!y)return x?-1:1;return (x.localeCompare(y,'fr')*dir)||(a.n||'').localeCompare(b.n||'','fr')});
const pages=Math.max(1,Math.ceil(r.length/ps));if(page>pages)page=pages;if(page<1)page=1;
const from=(page-1)*ps,shown=r.slice(from,from+ps);
$('#count').textContent=r.length+' résultat'+(r.length>1?'s':'');
$('#reset').hidden=!active();
document.querySelectorAll('th[data-k]').forEach(th=>{const on=th.dataset.k===sortK;if(on)th.setAttribute('aria-sort',dir>0?'ascending':'descending');else th.removeAttribute('aria-sort');th.querySelector('.ar').textContent=on?(dir>0?'▲':'▼'):''});
const sv=sortK+':'+dir;$('#sort').value=has('#sort',sv)?sv:'';
$('#tblEl').classList.toggle('nost',!shown.some(d=>d.st));
pager(r.length,pages,from,shown.length);syncUrl();
const dom=d=>{for(const u of [d.w,d.j]){if(!u)continue;try{const h=new URL(u).hostname.replace(/^www\./,'');if(!/linkedin\.com$/.test(h))return h}catch(e){}}return ''};
const ini=d=>`<span class="ini" aria-hidden="true">${esc((d.n||'?').trim().charAt(0).toUpperCase())}</span>`;
const logo=d=>{const h=dom(d);return (h||d.ic)?`<span class="lg"><img src="${d.ic?esc(d.ic):`https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=64`}" data-h="${esc(h)}" alt="" width="28" height="28" loading="lazy" referrerpolicy="no-referrer" data-i="${esc((d.n||'?').trim().charAt(0).toUpperCase())}"></span>`:`<span class="lg">${ini(d)}</span>`};
const L=(u,t,nm)=>u?`<a href="${esc(u)}" target="_blank" rel="noopener">${t}<span class="sr"> – ${esc(nm)} (nouvel onglet)</span></a>`:'';
if(!shown.length){$('#tb').innerHTML='<tr class="empty"><td colspan="6"><p>Aucune société ne correspond à ces critères.</p><button type="button" class="rbtn" data-reset>Réinitialiser la recherche</button></td></tr>';return}
$('#tb').innerHTML=shown.map(d=>{const ln=[L(d.li,'LinkedIn',d.n),L(d.j,'Carrières',d.n),L(d.w,'Site',d.n)].filter(Boolean).join('');
return `<tr><td><div class="co">${logo(d)}<div><div class="name">${esc(d.n)}</div>${d.no?`<div class="notes">${esc(d.no)}</div>`:''}${d.vf?`<div class="notes vf">✓ ${esc(d.vf)}</div>`:''}</div></div></td>
<td class="og">${esc(d.o||'À vérifier')}</td><td class="sec">${esc(d.s)}</td>
<td><span class="chips">${d.cs.map(v=>`<span class="chip${v==='À vérifier'?' unk':''}">${esc(v)}</span>`).join('')}</span><div class="loc">${esc(d.l)}</div></td>
<td><div class="links">${ln||'<span class="no">à vérifier</span>'}</div></td><td class="stack">${esc(d.st)}</td></tr>`}).join('');}
function pager(total,pages,from,n){
const nums=[];for(let i=1;i<=pages;i++){if(i===1||i===pages||Math.abs(i-page)<=1)nums.push(i);else if(nums[nums.length-1]!=='…')nums.push('…');}
const btn=(lab,p,dis,cur,aria)=>`<button type="button" data-p="${p}"${dis?' disabled':''}${cur?' aria-current="page"':''} aria-label="${aria||('Page '+lab)}">${lab}</button>`;
const html=total?`<span class="pinfo">${from+1}–${from+n} sur ${total}</span>`+(pages>1?`<span class="pbtns">`+btn('‹',page-1,page===1,false,'Page précédente')+nums.map(x=>x==='…'?'<span class="dots" aria-hidden="true">…</span>':btn(x,x,false,x===page)).join('')+btn('›',page+1,page===pages,false,'Page suivante')+'</span>':''):'<span class="pinfo">Aucune société ne correspond.</span>';
document.querySelectorAll('.pager').forEach(el=>el.innerHTML=html);}
document.querySelectorAll('.pager').forEach(el=>el.addEventListener('click',e=>{const b=e.target.closest('button[data-p]');if(!b||b.disabled)return;page=+b.dataset.p;render();if(el.id==='pgBot')$('#pgTop').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}));
$('#ps').addEventListener('change',e=>{ps=+e.target.value;page=1;try{localStorage.setItem(PS_KEY,ps)}catch(_){}render();});
['#q','#city','#orig','#jobs'].forEach(s=>$(s).addEventListener('input',()=>{page=1;render();}));
document.querySelectorAll('th[data-k]').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.k;dir=sortK===k?-dir:1;sortK=k;page=1;render()}));
$('#sort').addEventListener('change',e=>{const [k,v]=e.target.value.split(':');if(!k)return;sortK=k;dir=+v;page=1;render()});
const reset=()=>{$('#q').value='';$('#city').value='';$('#orig').value='';$('#jobs').checked=false;sortK='n';dir=1;page=1;render();$('#q').focus()};
$('#reset').addEventListener('click',reset);
$('#tb').addEventListener('click',e=>{if(e.target.closest('[data-reset]'))reset()});
const toIni=t=>{if(t.dataset.h&&!t.dataset.alt){t.dataset.alt='1';t.src='https://icons.duckduckgo.com/ip3/'+t.dataset.h+'.ico';return}const sp=document.createElement('span');sp.className='ini';sp.textContent=t.dataset.i;t.replaceWith(sp)};
document.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.dataset.i)toIni(t)},true);
document.addEventListener('load',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.naturalHeight&&t.naturalWidth/t.naturalHeight>1.6&&t.parentNode)t.parentNode.classList.add('wide');if(t&&t.tagName==='IMG'&&t.dataset.i&&((!t.dataset.alt&&t.naturalWidth<=16)||(t.dataset.alt&&t.naturalWidth===48)))toIni(t)},true);
render();

}).catch(()=>{document.getElementById('tb').innerHTML='<tr><td colspan="6">Impossible de charger la liste.</td></tr>'});
